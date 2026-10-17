import json
import logging
from typing import Any
from .base import BaseLLMProvider

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """당신은 산업용 청소장비 렌탈·판매·AS 전문 기업 '스페이스(SPACE)'의 수석 상담 결론 정리 AI입니다.
고객과의 통화 녹취록 및 감지 키워드를 분석하여 기술상담(TECH_COUNSEL), 영업문의/견적(SALES_QUOTE), 데모시연(DEMO_REQUEST), 납품일정 조정(DELIVERY_ADJUST), AS 방문일정 조정(AS_SCHEDULE) 결론을 순수 JSON 형식으로만 반환하세요."""


class GroqLLMProvider(BaseLLMProvider):
    """
    Groq Cloud LPU 가속 기반 초고속 무료/저지연 LLM 상담 결론 정리 구현체
    - 기본 모델: llama-3.3-70b-versatile (폴백: llama-3.1-8b-instant)
    - 엔드포인트: https://api.groq.com/openai/v1
    """

    def __init__(self, api_key: str, model: str = "llama-3.3-70b-versatile"):
        self.api_key = api_key
        self.model = model
        self.base_url = "https://api.groq.com/openai/v1"
        self._client = None

    def _get_client(self):
        if self._client is None:
            from openai import AsyncOpenAI
            self._client = AsyncOpenAI(
                api_key=self.api_key,
                base_url=self.base_url,
            )
        return self._client

    async def analyze_call(self, transcript: str, prompt_override: str | None = None) -> dict[str, Any]:
        if not self.api_key:
            return {
                "summary": "GROQ_API_KEY 미설정",
                "customer_intent": "미확인",
                "action_items": [],
                "raw_response": "",
                "error": "서버 보안 볼트(private_vault)에 GROQ_API_KEY가 설정되지 않았습니다.",
            }

        client = self._get_client()
        system_content = prompt_override or SYSTEM_PROMPT

        try:
            logger.info(f"[GroqLLMProvider] Groq LPU LLM 분석 요청 -> 모델: {self.model}")
            response = await client.chat.completions.create(
                model=self.model,
                temperature=0.1,
                messages=[
                    {"role": "system", "content": system_content},
                    {"role": "user", "content": f"통화 녹취록:\n{transcript}"},
                ],
                response_format={"type": "json_object"},
            )
            raw_content = response.choices[0].message.content or "{}"
            parsed = json.loads(raw_content)
            return {
                "summary": parsed.get("summary", ""),
                "customer_intent": parsed.get("customer_intent", ""),
                "action_items": parsed.get("action_items", []),
                "outcomes": parsed.get("outcomes", []),
                "raw_response": raw_content,
                "error": None,
            }
        except Exception as e:
            logger.error(f"[GroqLLMProvider] 분석 실패: {e}")
            return {
                "summary": "",
                "customer_intent": "",
                "action_items": [],
                "raw_response": "",
                "error": str(e),
            }
