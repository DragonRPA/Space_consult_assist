import logging
import httpx
from typing import Any
from .base import BaseMessagingProvider

logger = logging.getLogger(__name__)

class AligoMessagingProvider(BaseMessagingProvider):
    """
    알리고(Aligo) 카카오 알림톡 및 SMS 연동 구현체
    """
    def __init__(self, key: str, user_id: str, sender: str):
        self.key = key
        self.user_id = user_id
        self.sender = sender
        self._http_client: httpx.AsyncClient | None = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._http_client is None or self._http_client.is_closed:
            self._http_client = httpx.AsyncClient(timeout=10.0)
        return self._http_client

    async def send_alimtalk(
        self,
        receiver_phone: str,
        template_code: str,
        template_params: dict[str, str],
        fallback_message: str | None = None,
        sender_number: str | None = None
    ) -> dict[str, Any]:
        sender = sender_number or self.sender
        client = self._get_client()
        
        # 템플릿 변수 치환 또는 포맷팅 (fallback 메시지 활용)
        msg = fallback_message or template_params.get("message", "")

        payload = {
            "key": self.key,
            "userid": self.user_id,
            "sender": sender,
            "receiver": receiver_phone.replace("-", ""),
            "kakao_type": "at",
            "template_code": template_code,
            "message": msg,
        }

        try:
            logger.info(f"[AligoMessagingProvider] 알림톡 발송 -> {receiver_phone}")
            res = await client.post("https://apis.aligo.in/send/", data=payload)
            res_data = res.json()
            is_success = res_data.get("result_code") == "1"

            return {
                "success": is_success,
                "message_id": str(res_data.get("msg_id", "")),
                "channel": "ALIMTALK",
                "error": None if is_success else res_data.get("message")
            }
        except Exception as e:
            logger.error(f"[AligoMessagingProvider] 알림톡 발송 실패: {e}")
            return {
                "success": False,
                "message_id": "",
                "channel": "ALIMTALK",
                "error": str(e)
            }

    async def send_sms(
        self,
        receiver_phone: str,
        message: str,
        sender_number: str | None = None
    ) -> dict[str, Any]:
        sender = sender_number or self.sender
        client = self._get_client()
        payload = {
            "key": self.key,
            "userid": self.user_id,
            "sender": sender,
            "receiver": receiver_phone.replace("-", ""),
            "msg": message,
        }

        try:
            logger.info(f"[AligoMessagingProvider] SMS 발송 -> {receiver_phone}")
            res = await client.post("https://apis.aligo.in/send/", data=payload)
            res_data = res.json()
            is_success = res_data.get("result_code") == "1"

            return {
                "success": is_success,
                "message_id": str(res_data.get("msg_id", "")),
                "channel": "SMS",
                "error": None if is_success else res_data.get("message")
            }
        except Exception as e:
            logger.error(f"[AligoMessagingProvider] SMS 발송 실패: {e}")
            return {
                "success": False,
                "message_id": "",
                "channel": "SMS",
                "error": str(e)
            }

    def parse_webhook_event(self, payload: dict[str, Any]) -> dict[str, Any]:
        code = payload.get("code")
        status = "DELIVERED" if code == "0" else "FAILED"
        return {
            "message_id": str(payload.get("mid", "")),
            "status": status,
            "error_code": None if status == "DELIVERED" else str(code),
            "raw": payload
        }
