"""
STT Router: Faster-Whisper Large-v3 Endpoints & WebSocket (Loopback + File)
"""

import asyncio
import os
import logging
from fastapi import APIRouter, UploadFile, File, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from app.services.stt_service import transcribe_audio_file, get_whisper_model
from app.services.wasapi_loopback_service import get_loopback_service, list_loopback_devices, RECORDINGS_DIR

router = APIRouter()
logger = logging.getLogger("space_advisor.stt_api")


@router.get("/status")
async def get_stt_engine_status():
    """Faster-Whisper 엔진 상태 및 루프백 캡처 가능 장치 목록 반환"""
    model = get_whisper_model()
    is_gpu_ready = model is not None
    loopback_svc = get_loopback_service()
    devices = list_loopback_devices()
    return {
        "engine": "Faster-Whisper Large-v3-Turbo",
        "device": "NVIDIA GeForce RTX 5080 (CUDA / float16)" if is_gpu_ready else "CPU/Standby",
        "is_ready": is_gpu_ready,
        "loopback_running": loopback_svc.is_running,
        "loopback_devices": devices,
        "max_concurrent": 8,
        "supported_formats": [".m4a", ".wav", ".mp3", ".flac", ".ogg", ".webm"]
    }


@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    파일 기반 배치 전사: 업로드된 오디오 파일을 Faster-Whisper로 전사합니다.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No audio file provided.")
    try:
        content = await file.read()
        logger.info(f"🎙️ [STT] Received audio file '{file.filename}' ({len(content):,} bytes) for Large-v3 transcription...")
        result = transcribe_audio_file(content, filename=file.filename)
        return JSONResponse(status_code=200, content=result)
    except Exception as e:
        logger.error(f"❌ [STT Error]: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/recordings")
async def list_recordings():
    """저장된 통화 녹음 파일 목록 반환"""
    os.makedirs(RECORDINGS_DIR, exist_ok=True)
    files = sorted(
        [f for f in os.listdir(RECORDINGS_DIR) if f.endswith(".wav")],
        reverse=True
    )
    return {"recordings": files, "count": len(files)}


@router.get("/recordings/{filename}")
async def download_recording(filename: str):
    """통화 녹음 파일 다운로드"""
    # 경로 순회 공격 방지
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    filepath = os.path.join(RECORDINGS_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Recording not found")
    return FileResponse(
        path=filepath,
        filename=filename,
        media_type="audio/wav"
    )


@router.post("/reset")
async def reset_stt_session():
    """진행 중인 루프백 버퍼 및 세션 완전 초기화"""
    loopback_svc = get_loopback_service()
    loopback_svc.clear_buffer()
    return {"status": "cleared"}


@router.websocket("/ws")
async def stt_loopback_websocket(websocket: WebSocket):
    """
    WASAPI Loopback 실시간 STT WebSocket.

    클라이언트 → 서버: JSON {"action": "start", "device": "CABLE Input (VB-Audio Virtual Cable)", "chunk_seconds": 2}
    클라이언트 → 서버: JSON {"action": "stop"}
    클라이언트 → 서버: JSON {"action": "clear_buffer"}
    서버 → 클라이언트: JSON {"text": "...", "start": 0.0, "end": 2.1}  (실시간 세그먼트)
    서버 → 클라이언트: JSON {"status": "connected", "device": "..."}
    서버 → 클라이언트: JSON {"status": "stopped", "recording": "20260823_235900_call_recording.wav"}
    서버 → 클라이언트: JSON {"status": "buffer_cleared"}
    서버 → 클라이언트: JSON {"error": "..."}
    """
    await websocket.accept()
    logger.info("⚡ [STT-WS] Client connected for WASAPI Loopback real-time STT")

    loopback_svc = get_loopback_service()
    loop = asyncio.get_event_loop()

    def on_segment(segment: dict):
        """백그라운드 스레드 → WebSocket 비동기 전송"""
        try:
            asyncio.run_coroutine_threadsafe(
                websocket.send_json(segment),
                loop
            )
        except Exception:
            pass

    try:
        while True:
            msg = await websocket.receive_json()
            action = msg.get("action", "")

            if action == "start":
                if loopback_svc.is_running:
                    loopback_svc.clear_buffer()
                else:
                    device_name = msg.get("device", None)
                    chunk_seconds = float(msg.get("chunk_seconds", 2.0))
                    chunk_seconds = max(0.3, min(chunk_seconds, 10.0))
                    logger.info(f"▶ [STT-WS] Loopback STT 시작 (device={device_name}, chunk={chunk_seconds}s)")
                    loopback_svc.start(on_segment, device_name=device_name, chunk_seconds=chunk_seconds)

            elif action == "clear_buffer" or action == "reset":
                logger.info("🧹 [STT-WS] Loopback 버퍼 클리어 요청")
                loopback_svc.clear_buffer()
                await websocket.send_json({"status": "buffer_cleared"})

            elif action == "stop":
                logger.info("⏹ [STT-WS] Loopback STT 중지 + 녹음 저장")
                recording_filename = loopback_svc.stop()
                resp = {"status": "stopped"}
                if recording_filename:
                    resp["recording"] = recording_filename
                    logger.info(f"📼 녹음 파일 저장: {recording_filename}")
                await websocket.send_json(resp)

    except WebSocketDisconnect:
        logger.info("🔌 [STT-WS] Client disconnected → stopping loopback")
    except Exception as e:
        logger.warning(f"⚠️ [STT-WS] Error: {e}")
    finally:
        loopback_svc.stop()
