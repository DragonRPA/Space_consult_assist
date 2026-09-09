import logging
import io
from typing import Any, BinaryIO
from .base import BaseSTTProvider

logger = logging.getLogger(__name__)

class OpenAIWhisperProvider(BaseSTTProvider):
    """
    OpenAI Whisper API 기반 경량 STT 구현체
    - 벌처 VPS에서 직접 GPU를 돌리지 않고 API로 초경량 변환
    """
    def __init__(self, api_key: str, model: str = "whisper-1"):
        self.api_key = api_key
        self.model = model
        self._client = None

    def _get_client(self):
        if self._client is None:
            from openai import AsyncOpenAI
            self._client = AsyncOpenAI(api_key=self.api_key)
        return self._client

    async def transcribe(self, audio_content: bytes | BinaryIO, filename: str = "audio.wav") -> dict[str, Any]:
        if not self.api_key:
            return {
                "text": "",
                "language": "ko",
                "duration": None,
                "error": "OpenAI API Key가 설정되지 않았습니다."
            }

        client = self._get_client()
        
        raw_bytes = audio_content if isinstance(audio_content, (bytes, bytearray)) else audio_content.read()
        file_tuple = (filename, raw_bytes, "audio/wav")

        try:
            logger.info(f"[OpenAIWhisperProvider] Whisper API 변환 요청 -> 모델: {self.model}, 파일: {filename}")
            response = await client.audio.transcriptions.create(
                model=self.model,
                file=file_tuple,
                language="ko"
            )
            return {
                "text": response.text,
                "language": "ko",
                "duration": getattr(response, "duration", None),
                "error": None
            }
        except Exception as e:
            logger.error(f"[OpenAIWhisperProvider] STT 변환 실패: {e}")
            return {
                "text": "",
                "language": "ko",
                "duration": None,
                "error": str(e)
            }
