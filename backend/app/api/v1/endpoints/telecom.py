from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Any
from app.services.messaging import get_messaging_provider, BaseMessagingProvider

router = APIRouter()

class SendMessageRequest(BaseModel):
    receiver_phone: str
    channel: str = "ALIMTALK"  # "ALIMTALK" | "SMS"
    template_code: str = ""
    template_params: dict[str, str] = {}
    fallback_message: str | None = None
    sender_number: str | None = None

class WebhookResponse(BaseModel):
    status: str
    message_id: str
    event_status: str

@router.post("/send", summary="비즈메시지 발송 (알림톡/SMS)")
async def send_message(
    req: SendMessageRequest,
    provider: BaseMessagingProvider = Depends(get_messaging_provider)
):
    """
    설정된 통신사(세종텔레콤/알리고/Mock) 공급자를 통해 알림톡 또는 SMS 발송
    """
    if req.channel.upper() == "ALIMTALK":
        if not req.template_code:
            raise HTTPException(status_code=400, detail="알림톡 발송 시 template_code는 필수입니다.")
        result = await provider.send_alimtalk(
            receiver_phone=req.receiver_phone,
            template_code=req.template_code,
            template_params=req.template_params,
            fallback_message=req.fallback_message,
            sender_number=req.sender_number
        )
    else:
        message_text = req.fallback_message or req.template_params.get("message", "")
        if not message_text:
            raise HTTPException(status_code=400, detail="SMS 발송 시 메시지 본문은 필수입니다.")
        result = await provider.send_sms(
            receiver_phone=req.receiver_phone,
            message=message_text,
            sender_number=req.sender_number
        )

    if not result.get("success"):
        raise HTTPException(status_code=502, detail=result.get("error", "메시지 발송 실패"))

    return result

@router.post("/webhook", summary="통신사 결과 콜백 웹훅")
async def receive_telecom_webhook(
    payload: dict[str, Any],
    provider: BaseMessagingProvider = Depends(get_messaging_provider)
):
    """
    세종텔레콤 또는 알리고 등으로부터 발송 성공/실패 결과 수신 및 표준 파싱
    """
    parsed = provider.parse_webhook_event(payload)
    return WebhookResponse(
        status="OK",
        message_id=parsed["message_id"],
        event_status=parsed["status"]
    )
