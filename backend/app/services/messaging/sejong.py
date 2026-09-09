import logging
import httpx
import uuid
from typing import Any
from .base import BaseMessagingProvider

logger = logging.getLogger(__name__)

class SejongMessagingProvider(BaseMessagingProvider):
    """
    세종텔레콤(세종네트웍스) 비즈메시지 API 연동 구현체
    - 벌처의 고정 IP 환경에서 세종텔레콤 방화벽을 통과하여 호출
    - 알림톡 실패 시 자동으로 SMS/LMS 전환(Fallback) 발송 처리
    """
    def __init__(self, api_url: str, client_id: str, client_secret: str, default_sender: str = ""):
        self.api_url = api_url.rstrip("/")
        self.client_id = client_id
        self.client_secret = client_secret
        self.default_sender = default_sender
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
        sender = sender_number or self.default_sender
        payload = {
            "to": receiver_phone.replace("-", ""),
            "from": sender,
            "type": "ALIMTALK",
            "template_code": template_code,
            "template_params": template_params,
            "client_id": self.client_id
        }

        client = self._get_client()
        headers = {
            "Content-Type": "application/json",
            "X-Client-Secret": self.client_secret
        }

        try:
            logger.info(f"[SejongMessagingProvider] 알림톡 발송 시도 -> {receiver_phone} (템플릿: {template_code})")
            response = await client.post(f"{self.api_url}/send", json=payload, headers=headers)
            res_data = response.json() if response.content else {}

            if response.status_code == 200 and res_data.get("code") == "0000":
                return {
                    "success": True,
                    "message_id": res_data.get("message_id", str(uuid.uuid4())),
                    "channel": "ALIMTALK",
                    "error": None
                }
            
            # 알림톡 실패 시 Fallback 시도
            error_reason = res_data.get("message", f"HTTP {response.status_code}")
            logger.warning(f"[SejongMessagingProvider] 알림톡 실패 ({error_reason}) -> Fallback SMS 시도")
            
            if fallback_message:
                fallback_res = await self.send_sms(receiver_phone, fallback_message, sender)
                if fallback_res["success"]:
                    return {
                        "success": True,
                        "message_id": fallback_res["message_id"],
                        "channel": "FALLBACK_SMS",
                        "error": None
                    }
            
            return {
                "success": False,
                "message_id": "",
                "channel": "ALIMTALK",
                "error": error_reason
            }

        except Exception as e:
            logger.error(f"[SejongMessagingProvider] 통신 오류: {e}")
            if fallback_message:
                logger.info(f"[SejongMessagingProvider] 예외 발생 후 Fallback SMS 시도")
                return await self.send_sms(receiver_phone, fallback_message, sender)
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
        sender = sender_number or self.default_sender
        payload = {
            "to": receiver_phone.replace("-", ""),
            "from": sender,
            "type": "SMS" if len(message.encode("euc-kr", errors="ignore")) <= 90 else "LMS",
            "message": message,
            "client_id": self.client_id
        }

        client = self._get_client()
        headers = {
            "Content-Type": "application/json",
            "X-Client-Secret": self.client_secret
        }

        try:
            logger.info(f"[SejongMessagingProvider] SMS/LMS 발송 시도 -> {receiver_phone}")
            response = await client.post(f"{self.api_url}/send", json=payload, headers=headers)
            res_data = response.json() if response.content else {}

            if response.status_code == 200 and res_data.get("code") == "0000":
                return {
                    "success": True,
                    "message_id": res_data.get("message_id", str(uuid.uuid4())),
                    "channel": "SMS",
                    "error": None
                }
            return {
                "success": False,
                "message_id": "",
                "channel": "SMS",
                "error": res_data.get("message", f"HTTP {response.status_code}")
            }
        except Exception as e:
            logger.error(f"[SejongMessagingProvider] SMS 발송 통신 실패: {e}")
            return {
                "success": False,
                "message_id": "",
                "channel": "SMS",
                "error": str(e)
            }

    def parse_webhook_event(self, payload: dict[str, Any]) -> dict[str, Any]:
        """
        세종텔레콤 웹훅 규격 파싱
        """
        raw_status = payload.get("status", "").upper()
        status_map = {
            "SUCCESS": "DELIVERED",
            "DELIVERED": "DELIVERED",
            "FAIL": "FAILED",
            "FAILED": "FAILED",
            "PROCESSING": "PENDING"
        }
        mapped_status = status_map.get(raw_status, "PENDING")

        return {
            "message_id": str(payload.get("message_id", "")),
            "status": mapped_status,
            "error_code": payload.get("error_code") if mapped_status == "FAILED" else None,
            "raw": payload
        }
