import logging
import json
from typing import Any
from .base import BaseLLMProvider

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """당신은 인테리어 차양/블라인드 전문 기업 '스페이스(Space)'의 전문 상담 분석 AI입니다.
고객과의 통화 녹취 텍스트를 분석하여 아래 JSON 포맷으로 응답하세요.

{
  "summary": "핵심 통화 내용 2~3줄 요약",
  "customer_intent": "고객의 주 목적 (예: A/S 출장 요청, 단순 견적 문의, 셀프 수리 안내 등)",
  "action_items": ["수행해야 할 후속 조치 1", "후속 조치 2"]
}
반드시 순수 JSON 형식만 반환하세요."""

class OpenAILLMProvider(BaseLLMProvider):
    """
    OpenAI gpt-4o-mini 기반 통화 분석 및 요약 구현체
    """
    def __init__(self, api_key: str, model: str = "gpt-4o-mini"):
        self.api_key = api_key
        self.model = model
        self._client = None

    def _get_client(self):
        if self._client is None:
            from openai import AsyncOpenAI
            self._client = AsyncOpenAI(api_key=self.api_key)
        return self._client

    async def analyze_call(self, transcript: str, prompt_override: str | None = None) -> dict[str, Any]:
        if not self.api_key:
            return {
                "summary": "API 키 미설정",
                "customer_intent": "미확인",
                "action_items": [],
                "raw_response": "",
                "error": "OpenAI API Key가 설정되지 않았습니다."
            }

        client = self._get_client()
        system_content = prompt_override or SYSTEM_PROMPT

        try:
            logger.info(f"[OpenAILLMProvider] LLM 분석 요청 -> 모델: {self.model}")
            response = await client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_content},
                    {"role": "user", "content": f"통화 녹취록:\n{transcript}"}
                ],
                response_format={"type": "json_object"}
            )
            raw_content = response.choices[0].message.content or "{}"
            parsed = json.loads(raw_content)

            return {
                "summary": parsed.get("summary", ""),
                "customer_intent": parsed.get("customer_intent", ""),
                "action_items": parsed.get("action_items", []),
                "raw_response": raw_content,
                "error": None
            }
        except Exception as e:
            logger.error(f"[OpenAILLMProvider] 분석 실패: {e}")
            return {
                "summary": "",
                "customer_intent": "",
                "action_items": [],
                "raw_response": "",
                "error": str(e)
            }
