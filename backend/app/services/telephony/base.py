from abc import ABC, abstractmethod
from typing import Any

class BaseTelephonyProvider(ABC):
    """
    PBX 및 음성 통화 이벤트 처리 추상 인터페이스
    """
    @abstractmethod
    async def handle_call_event(
        self,
        call_id: str,
        event_type: str,
        caller: str,
        callee: str,
        extra: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        """
        통화 상태 변경(시작, 벨울림, 연결, 종료 등) 이벤트 처리
        """
        pass

    @abstractmethod
    async def process_recording(
        self,
        call_id: str,
        audio_content: bytes,
        filename: str
    ) -> dict[str, Any]:
        """
        통화 녹음 파일 업로드(R2/Local) 및 STT -> LLM 연계 분석 파이프라인 수행
        """
        pass
