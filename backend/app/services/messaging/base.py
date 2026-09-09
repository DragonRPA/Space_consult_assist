from abc import ABC, abstractmethod
from typing import Any

class BaseMessagingProvider(ABC):
    """
    비즈메시지(알림톡/SMS) 발송 및 웹훅 콜백 처리 추상 인터페이스
    """
    @abstractmethod
    async def send_alimtalk(
        self,
        receiver_phone: str,
        template_code: str,
        template_params: dict[str, str],
        fallback_message: str | None = None,
        sender_number: str | None = None
    ) -> dict[str, Any]:
        """
        카카오 알림톡 발송 (실패 시 SMS Fallback 지원)
        반환값: {"success": bool, "message_id": str, "channel": "ALIMTALK" | "FALLBACK_SMS", "error": str | None}
        """
        pass

    @abstractmethod
    async def send_sms(
        self,
        receiver_phone: str,
        message: str,
        sender_number: str | None = None
    ) -> dict[str, Any]:
        """
        일반 SMS/LMS 발송
        반환값: {"success": bool, "message_id": str, "channel": "SMS", "error": str | None}
        """
        pass

    @abstractmethod
    def parse_webhook_event(self, payload: dict[str, Any]) -> dict[str, Any]:
        """
        통신사 결과 콜백 데이터를 표준 규격으로 파싱
        표준 규격: {"message_id": str, "status": "DELIVERED" | "FAILED" | "PENDING", "error_code": str | None, "raw": dict}
        """
        pass
