import logging
import uuid
from typing import Any
from .base import BaseTelephonyProvider
from app.services.storage import get_storage_provider
from app.services.ai import get_stt_provider, get_llm_provider

logger = logging.getLogger(__name__)

class GenericWebhookTelephonyProvider(BaseTelephonyProvider):
    """
    벌처에 호스팅된 PBX(Asterisk, FreePBX 등)의 웹훅 및 녹음 연동 파이프라인
    """
    async def handle_call_event(
        self,
        call_id: str,
        event_type: str,
        caller: str,
        callee: str,
        extra: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        logger.info(
            f"[TelephonyProvider] 통화 이벤트 수신: {event_type} | "
            f"Call ID: {call_id} | 발신: {caller} -> 착신: {callee}"
        )
        return {
            "call_id": call_id,
            "status": "PROCESSED",
            "event_type": event_type
        }

    async def process_recording(
        self,
        call_id: str,
        audio_content: bytes,
        filename: str
    ) -> dict[str, Any]:
        logger.info(f"[TelephonyProvider] 녹음 처리 파이프라인 시작 -> Call ID: {call_id}, 파일: {filename}")
        storage = get_storage_provider()
        stt = get_stt_provider()
        llm = get_llm_provider()

        # 1. 스토리지(R2 또는 로컬)에 녹음 파일 저장
        destination_path = f"recordings/{call_id}/{filename}"
        audio_url = await storage.upload_file(audio_content, destination_path)
        logger.info(f"[TelephonyProvider] 1단계: 스토리지 저장 완료 -> {audio_url}")

        # 2. STT 변환 (OpenAI Whisper 또는 Mock)
        stt_result = await stt.transcribe(audio_content, filename)
        transcript = stt_result.get("text", "")
        logger.info(f"[TelephonyProvider] 2단계: STT 변환 완료 -> 길이: {len(transcript)}자")

        # 3. LLM 분석 (요약 및 액션 아이템 도출)
        llm_result = {}
        if transcript:
            llm_result = await llm.analyze_call(transcript)
            logger.info(f"[TelephonyProvider] 3단계: LLM 분석 완료 -> 요약: {llm_result.get('summary')[:30]}...")

        return {
            "call_id": call_id,
            "audio_url": audio_url,
            "transcript": transcript,
            "stt_meta": {
                "language": stt_result.get("language"),
                "duration": stt_result.get("duration")
            },
            "analysis": llm_result,
            "status": "COMPLETED"
        }
