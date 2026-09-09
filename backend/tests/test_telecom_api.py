import sys
import os
from pathlib import Path
from fastapi.testclient import TestClient

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.main import app

client = TestClient(app)

def test_telecom_endpoints():
    print("--- [1] Telecom API Endpoints Test ---")
    
    # 1. Alimtalk 발송
    send_payload = {
        "receiver_phone": "010-9999-8888",
        "channel": "ALIMTALK",
        "template_code": "TPL_INSPECTION_COMPLETED",
        "template_params": {"customer": "스페이스고객"},
        "fallback_message": "출장 완료 문자 안내"
    }
    res = client.post("/api/v1/telecom/send", json=send_payload)
    assert res.status_code == 200, f"발송 실패: {res.text}"
    data = res.json()
    assert data["success"] is True
    print("  ✓ /api/v1/telecom/send OK:", data)

    # 2. Webhook 콜백
    webhook_payload = {
        "message_id": "sejong_msg_12345",
        "status": "DELIVERED"
    }
    res_webhook = client.post("/api/v1/telecom/webhook", json=webhook_payload)
    assert res_webhook.status_code == 200
    print("  ✓ /api/v1/telecom/webhook OK:", res_webhook.json())

def test_telephony_endpoints():
    print("--- [2] Telephony API Endpoints Test ---")

    # 1. Call event
    event_payload = {
        "call_id": "pbx_call_001",
        "event_type": "CALL_ENDED",
        "caller": "010-1234-5678",
        "callee": "1588-0000"
    }
    res_event = client.post("/api/v1/telephony/call-event", json=event_payload)
    assert res_event.status_code == 200
    print("  ✓ /api/v1/telephony/call-event OK:", res_event.json())

    # 2. Upload recording
    files = {"file": ("sample_call.wav", b"RIFFWAVE_MOCK_DATA", "audio/wav")}
    data = {"call_id": "pbx_call_001"}
    res_upload = client.post("/api/v1/telephony/upload-recording", data=data, files=files)
    assert res_upload.status_code == 200
    upload_res = res_upload.json()
    assert upload_res["status"] == "COMPLETED"
    print("  ✓ /api/v1/telephony/upload-recording OK -> Audio URL:", upload_res["audio_url"])

def main():
    if sys.platform == "win32":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass
    print("==========================================")
    print("[TEST] FastAPI Telecom & Telephony Endpoints Test Start")
    print("==========================================")
    test_telecom_endpoints()
    test_telephony_endpoints()
    print("==========================================")
    print("[SUCCESS] All API Endpoints Tests Passed 100%")
    print("==========================================")

if __name__ == "__main__":
    main()
