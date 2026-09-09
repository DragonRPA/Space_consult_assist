"""
ollama_client.py
Ollama REST API와 통신하여 텍스트 분석을 요청합니다.
"""
import os
import json
import requests
from typing import Optional


class LocalSLMRunner:
    """자체 훈련된 space-slm-0.5b-v2 인프로세스 초경량 가속 러너 (Ollama 500 에러 원천 방지)"""
    _instance = None
    _model = None
    _tokenizer = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        self.model_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "..", "scripts", "merged_qwen_0.5b_v2")
        )

    def load_once(self):
        if self._model is None:
            import torch
            from transformers import AutoModelForCausalLM, AutoTokenizer
            self._tokenizer = AutoTokenizer.from_pretrained(self.model_path)
            self._model = AutoModelForCausalLM.from_pretrained(
                self.model_path,
                dtype=torch.float16,
                device_map="cuda" if torch.cuda.is_available() else "cpu"
            )

    def generate(self, prompt: str, content: str) -> str:
        self.load_once()
        import torch
        messages = [
            {"role": "system", "content": prompt},
            {"role": "user", "content": content[:1200]}
        ]
        input_text = self._tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = self._tokenizer(input_text, return_tensors="pt").to(self._model.device)
        with torch.no_grad():
            outputs = self._model.generate(
                **inputs,
                max_new_tokens=512,
                temperature=0.1,
                do_sample=False,
                pad_token_id=self._tokenizer.eos_token_id
            )
        generated_ids = outputs[0][inputs.input_ids.shape[1]:]
        return self._tokenizer.decode(generated_ids, skip_special_tokens=True).strip()


class OllamaClient:
    def __init__(self, base_url: str = "http://localhost:11434"):
        self.base_url = base_url.rstrip("/")

    def list_models(self) -> list[str]:
        """Ollama에 설치된 모델 목록 + 자체 훈련 SLM 목록을 반환합니다."""
        models = []
        # 1. 자체 훈련된 space-slm-0.5b-v2 모델 최상단 우선 등록
        v2_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "..", "scripts", "merged_qwen_0.5b_v2")
        )
        if os.path.exists(v2_path):
            models.append("space-slm-0.5b-v2 (🇰🇷 자체 훈련 균형 모델 / VRAM 0.9GB)")

        # 2. Ollama 원격/로컬 모델 목록
        try:
            resp = requests.get(f"{self.base_url}/api/tags", timeout=10)
            resp.raise_for_status()
            data = resp.json()
            for m in data.get("models", []):
                name = m["name"]
                if not name.startswith("space-slm"):
                    models.append(name)
        except Exception:
            pass

        return models

    def generate(
        self,
        model: str,
        prompt: str,
        content: str,
        timeout: int = 35,
    ) -> str:
        """
        Ollama generate API 또는 자체 SLM 러너를 호출하고 LLM 응답 텍스트를 반환합니다.

        Args:
            model: 사용할 Ollama 모델명 (예: 'gemma3:12b')
            prompt: 프롬프트 템플릿 ({{CONTENT}} 치환자 포함)
            content: {{CONTENT}}에 삽입할 실제 텍스트
            timeout: 요청 타임아웃(초) - 기본값 35초로 90초 대기 방지

        Returns:
            LLM이 생성한 텍스트 문자열

        Raises:
            ConnectionError: 서버 연결 불가
            RuntimeError: API 오류
        """
        # 자체 훈련 space-slm 모델 선택 시 인프로세스 고속 서빙 (Ollama 500 에러 회피)
        if "space-slm" in model.lower():
            return LocalSLMRunner.get_instance().generate(prompt, content)

        if "{{CONTENT}}" in prompt:
            full_prompt = prompt.replace("{{CONTENT}}", content)
        else:
            full_prompt = f"{prompt.strip()}\n\n[상담 내용]\n{content}"

        payload = {
            "model": model,
            "prompt": full_prompt,
            "stream": False,
            "options": {
                "temperature": 0.1,   # 분석 목적이므로 낮은 온도
                "num_predict": 768,   # JSON 생성용 적정 토큰 제한 (90초 헛생성 방지)
            },
        }

        try:
            resp = requests.post(
                f"{self.base_url}/api/generate",
                json=payload,
                timeout=timeout,
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("response", "").strip()

        except requests.exceptions.ConnectionError:
            raise ConnectionError(f"Ollama 서버에 연결할 수 없습니다: {self.base_url}")
        except requests.exceptions.Timeout:
            raise TimeoutError(f"Ollama 응답 시간 초과 ({timeout}초)")
        except requests.exceptions.HTTPError as e:
            raise RuntimeError(f"Ollama API 오류: {e}")
        except Exception as e:
            raise RuntimeError(f"예상치 못한 오류: {e}")

    def ping(self) -> bool:
        """Ollama 서버가 응답하는지 확인합니다."""
        try:
            resp = requests.get(f"{self.base_url}/api/tags", timeout=5)
            return resp.status_code == 200
        except Exception:
            return False
