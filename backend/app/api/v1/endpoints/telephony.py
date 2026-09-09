from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from pydantic import BaseModel
from typing import Any
from app.services.telephony import get_telephony_provider, BaseTelephonyProvider

router = APIRouter()

class CallEventRequest(BaseModel):
    call_id: str
    event_type: str  # "CALL_STARTED" | "RINGING" | "ANSWERED" | "CALL_ENDED"
    caller: str
    callee: str
    extra: dict[str, Any] | None = None

@router.post("/call-event", summary="PBX 통화 이벤트 웹훅")
async def receive_call_event(
    event: CallEventRequest,
    provider: BaseTelephonyProvider = Depends(get_telephony_provider)
):
    """
    벌처에 호스팅된 PBX(Asterisk) 등으로부터 통화 진행 상태 이벤트 수신
    """
    result = await provider.handle_call_event(
        call_id=event.call_id,
        event_type=event.event_type,
        caller=event.caller,
        callee=event.callee,
        extra=event.extra
    )
    return result

@router.post("/upload-recording", summary="통화 녹음 파일 수신 및 AI 파이프라인 트리거")
async def upload_call_recording(
    call_id: str = Form(...),
    file: UploadFile = File(...),
    provider: BaseTelephonyProvider = Depends(get_telephony_provider)
):
    """
    통화 종료 후 PBX에서 생성된 .wav 파일을 수신하여
    스토리지(R2/Local) 저장 -> STT 변환 -> LLM 요약 파이프라인 일괄 실행
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="파일명이 존재하지 않습니다.")

    audio_bytes = await file.read()
    if len(audio_bytes) == 0:
        raise HTTPException(status_code=400, detail="빈 오디오 파일입니다.")

    result = await provider.process_recording(
        call_id=call_id,
        audio_content=audio_bytes,
        filename=file.filename
    )
    return result
