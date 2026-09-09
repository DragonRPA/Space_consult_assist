import logging
import json
import httpx
from typing import Any
from .base import BaseLLMProvider

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """당신은 인테리어 차양/블라인드 전문 기업 '스페이스(Space)'의 전문 상담 분석 AI입니다.
고객과의 통화 녹취 텍스트를 분석하여 반드시 아래 JSON 포맷으로만 응답하세요.

{
  "summary": "핵심 통화 내용 2~3줄 요약",
  "customer_intent": "고객의 주 목적",
  "action_items": ["수행해야 할 후속 조치 1", "후속 조치 2"]
}"""

class OllamaLLMProvider(BaseLLMProvider):
    """
    Ollama (사내 On-Premise GPU 서버 또는 로컬) 기반 분석 구현체
    """
    def __init__(self, base_url: str = "http://localhost:11434", model: str = "exaone3.5"):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self._http_client: httpx.AsyncClient | None = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._http_client is None or self._http_client.is_closed:
            self._http_client = httpx.AsyncClient(timeout=60.0)
        return self._http_client

    async def analyze_call(self, transcript: str, prompt_override: str | None = None) -> dict[str, Any]:
        client = self._get_client()
        system_content = prompt_override or SYSTEM_PROMPT

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_content},
                {"role": "user", "content": f"통화 녹취록:\n{transcript}"}
            ],
            "format": "json",
            "stream": False
        }

        try:
            logger.info(f"[OllamaLLMProvider] Ollama 분석 요청 -> {self.base_url}, 모델: {self.model}")
            res = await client.post(f"{self.base_url}/api/chat", json=payload)
            res_data = res.json()
            raw_content = res_data.get("message", {}).get("content", "{}")
            parsed = json.loads(raw_content)

            return {
                "summary": parsed.get("summary", ""),
                "customer_intent": parsed.get("customer_intent", ""),
                "action_items": parsed.get("action_items", []),
                "raw_response": raw_content,
                "error": None
            }
        except Exception as e:
            logger.error(f"[OllamaLLMProvider] 분석 실패: {e}")
            return {
                "summary": "",
                "customer_intent": "",
                "action_items": [],
                "raw_response": "",
                "error": str(e)
            }
