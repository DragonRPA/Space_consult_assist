import logging
from typing import Any, BinaryIO
from .base import BaseSTTProvider

logger = logging.getLogger(__name__)

class MockSTTProvider(BaseSTTProvider):
    """
    개발 및 테스트용 Mock STT 구현체
    """
    async def transcribe(self, audio_content: bytes | BinaryIO, filename: str = "audio.wav") -> dict[str, Any]:
        logger.info(f"[MockSTTProvider] 오디오 변환 시뮬레이션: {filename}")
        return {
            "text": "고객님 콤비 블라인드 줄이 끊어져서 수리 출장 요청하셨습니다.",
            "language": "ko",
            "duration": 15.0,
            "error": None
        }
