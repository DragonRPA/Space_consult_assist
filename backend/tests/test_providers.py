import asyncio
import os
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.services.storage.local_storage import LocalStorageProvider
from app.services.messaging.mock import MockMessagingProvider
from app.services.messaging.sejong import SejongMessagingProvider
from app.services.ai.stt_mock import MockSTTProvider
from app.services.telephony.generic_webhook import GenericWebhookTelephonyProvider

async def test_local_storage():
    print("--- [1] LocalStorageProvider Test ---")
    storage = LocalStorageProvider(base_dir="./tests_recordings_tmp")
    test_content = b"RIFF....WAVEfmt test audio bytes"
    file_path = "test_call_123/call.wav"

    # Upload
    saved_path = await storage.upload_file(test_content, file_path)
    assert os.path.exists(saved_path), "파일이 로컬에 저장되어야 합니다."
    print("  ✓ Upload OK:", saved_path)

    # Download
    downloaded = await storage.download_file(file_path)
    assert downloaded == test_content, "다운로드된 바이트가 원본과 일치해야 합니다."
    print("  ✓ Download match OK")

    # Get URL
    url = await storage.get_url(file_path)
    assert url.endswith("call.wav"), "URL 형식이 올바라야 합니다."
    print("  ✓ URL OK:", url)

    # Delete
    deleted = await storage.delete_file(file_path)
    assert deleted and not os.path.exists(saved_path), "파일이 정상 삭제되어야 합니다."
    print("  ✓ Delete OK")

async def test_messaging_mock():
    print("--- [2] MockMessagingProvider Test ---")
    provider = MockMessagingProvider()

    # Alimtalk
    res = await provider.send_alimtalk("010-1234-5678", "TPL_001", {"name": "홍길동"})
    assert res["success"] is True, "Mock 발송은 항상 성공해야 합니다."
    assert res["channel"] == "ALIMTALK"
    print("  ✓ Alimtalk OK:", res["message_id"])

    # SMS
    res_sms = await provider.send_sms("010-1234-5678", "테스트 문자메시지")
    assert res_sms["success"] is True
    assert res_sms["channel"] == "SMS"
    print("  ✓ SMS OK:", res_sms["message_id"])

    # Webhook
    event = provider.parse_webhook_event({"message_id": "mid_999", "result": "ok"})
    assert event["status"] == "DELIVERED"
    print("  ✓ Webhook parse OK:", event["status"])

async def test_telephony_pipeline():
    print("--- [3] GenericWebhookTelephonyProvider Test ---")
    telephony = GenericWebhookTelephonyProvider()

    # Call event
    event_res = await telephony.handle_call_event(
        call_id="call_abc_123",
        event_type="CALL_ENDED",
        caller="010-1111-2222",
        callee="02-1234-5678"
    )
    assert event_res["status"] == "PROCESSED"
    print("  ✓ Call event OK")

    # Process recording (Storage -> STT -> LLM)
    mock_audio = b"MOCK_WAVE_HEADER_DATA"
    pipeline_res = await telephony.process_recording(
        call_id="call_abc_123",
        audio_content=mock_audio,
        filename="rec_123.wav"
    )
    assert pipeline_res["status"] == "COMPLETED"
    assert "audio_url" in pipeline_res
    assert len(pipeline_res["transcript"]) > 0
    print("  ✓ Pipeline OK -> Transcript:", pipeline_res["transcript"])

async def test_groq_stt():
    print("--- [4] GroqWhisperProvider Test ---")
    from app.services.ai.stt_groq import GroqWhisperProvider
    from app.services.ai import get_stt_provider

    # 1. 인스턴스 생성 및 인터페이스 검증
    groq_provider = GroqWhisperProvider(api_key="", model="whisper-large-v3-turbo")
    res = await groq_provider.transcribe(b"dummy_bytes", "test.wav")
    assert "error" in res and res["error"] is not None
    print("  ✓ GroqWhisperProvider Interface & Safe Fallback OK")

    # 2. 팩토리 함수 주입 검증
    active_stt = get_stt_provider()
    assert isinstance(active_stt, GroqWhisperProvider)
    assert active_stt.model == "whisper-large-v3-turbo"
    print("  ✓ Active STT Provider is GroqWhisperProvider:", active_stt.model)

async def main():
    if sys.platform == "win32":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass
    print("==========================================")
    print("[TEST] Provider Unit Tests Start")
    print("==========================================")
    await test_local_storage()
    await test_messaging_mock()
    await test_telephony_pipeline()
    await test_groq_stt()
    print("==========================================")
    print("[SUCCESS] All Provider Tests Passed 100%")
    print("==========================================")

if __name__ == "__main__":
    asyncio.run(main())
