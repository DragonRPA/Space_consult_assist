from abc import ABC, abstractmethod
from typing import Any, BinaryIO

class BaseSTTProvider(ABC):
    """
    음성 텍스트 변환(STT) 추상 인터페이스
    """
    @abstractmethod
    async def transcribe(self, audio_content: bytes | BinaryIO, filename: str = "audio.wav") -> dict[str, Any]:
        """
        오디오 바이트를 텍스트로 변환
        반환값: {"text": str, "language": str, "duration": float | None, "error": str | None}
        """
        pass

class BaseLLMProvider(ABC):
    """
    LLM 상담 분석 및 요약 추상 인터페이스
    """
    @abstractmethod
    async def analyze_call(self, transcript: str, prompt_override: str | None = None) -> dict[str, Any]:
        """
        상담 텍스트 분석, 핵심 요약, 고객 의도 및 조치 사항 도출
        반환값: {
            "summary": str,
            "customer_intent": str,
            "action_items": list[str],
            "raw_response": str,
            "error": str | None
        }
        """
        pass
