import logging
import uuid
from typing import Any
from .base import BaseMessagingProvider

logger = logging.getLogger(__name__)

class MockMessagingProvider(BaseMessagingProvider):
    """
    개발 및 테스트용 Mock 메시징 구현체
    """
    async def send_alimtalk(
        self,
        receiver_phone: str,
        template_code: str,
        template_params: dict[str, str],
        fallback_message: str | None = None,
        sender_number: str | None = None
    ) -> dict[str, Any]:
        msg_id = f"mock_msg_{uuid.uuid4().hex[:8]}"
        logger.info(
            f"[MockMessagingProvider] 알림톡 시뮬레이션 발송 -> "
            f"수신: {receiver_phone}, 템플릿: {template_code}, 변수: {template_params}, ID: {msg_id}"
        )
        return {
            "success": True,
            "message_id": msg_id,
            "channel": "ALIMTALK",
            "error": None
        }

    async def send_sms(
        self,
        receiver_phone: str,
        message: str,
        sender_number: str | None = None
    ) -> dict[str, Any]:
        msg_id = f"mock_sms_{uuid.uuid4().hex[:8]}"
        logger.info(
            f"[MockMessagingProvider] SMS 시뮬레이션 발송 -> "
            f"수신: {receiver_phone}, 본문: {message[:30]}..., ID: {msg_id}"
        )
        return {
            "success": True,
            "message_id": msg_id,
            "channel": "SMS",
            "error": None
        }

    def parse_webhook_event(self, payload: dict[str, Any]) -> dict[str, Any]:
        logger.info(f"[MockMessagingProvider] 웹훅 이벤트 수신 시뮬레이션: {payload}")
        return {
            "message_id": payload.get("message_id", "unknown_mock_id"),
            "status": "DELIVERED",
            "error_code": None,
            "raw": payload
        }
