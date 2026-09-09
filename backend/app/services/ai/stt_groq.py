import logging
from typing import Any, BinaryIO
from .base import BaseSTTProvider

logger = logging.getLogger(__name__)

class GroqWhisperProvider(BaseSTTProvider):
    """
    Groq LPU 가속 기반 초고속/초저비용 Whisper STT 구현체
    - 모델: whisper-large-v3-turbo (기본) 또는 whisper-large-v3
    - OpenAI 호환 엔드포인트(https://api.groq.com/openai/v1) 경유
    - 통화 음성(3분) 기준 약 1초 내외로 실시간 변환
    """
    def __init__(self, api_key: str, model: str = "whisper-large-v3-turbo"):
        self.api_key = api_key
        self.model = model
        self.base_url = "https://api.groq.com/openai/v1"
        self._client = None

    def _get_client(self):
        if self._client is None:
            from openai import AsyncOpenAI
            self._client = AsyncOpenAI(
                api_key=self.api_key,
                base_url=self.base_url
            )
        return self._client

    async def transcribe(self, audio_content: bytes | BinaryIO, filename: str = "audio.wav") -> dict[str, Any]:
        if not self.api_key:
            logger.warning("[GroqWhisperProvider] Groq API Key 미설정 (개발/테스트 모의 텍스트 반환)")
            return {
                "text": "고객님 콤비 블라인드 줄이 끊어져서 수리 출장 요청하셨습니다.",
                "language": "ko",
                "duration": 15.0,
                "error": "API Key 미설정 (Mock Fallback)"
            }

        client = self._get_client()
        raw_bytes = audio_content if isinstance(audio_content, (bytes, bytearray)) else audio_content.read()
        file_tuple = (filename, raw_bytes, "audio/wav")

        try:
            logger.info(f"[GroqWhisperProvider] Groq LPU 변환 요청 -> 모델: {self.model}, 파일: {filename}")
            response = await client.audio.transcriptions.create(
                model=self.model,
                file=file_tuple,
                language="ko",
                response_format="json"
            )
            return {
                "text": response.text,
                "language": "ko",
                "duration": getattr(response, "duration", None),
                "error": None
            }
        except Exception as e:
            logger.error(f"[GroqWhisperProvider] STT 변환 실패: {e}")
            return {
                "text": "",
                "language": "ko",
                "duration": None,
                "error": str(e)
            }
