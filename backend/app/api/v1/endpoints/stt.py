"""
STT Router: Faster-Whisper Large-v3 Endpoints & WebSocket
"""

from fastapi import APIRouter, UploadFile, File, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import JSONResponse
import logging
from app.services.stt_service import transcribe_audio_file, get_whisper_model

router = APIRouter()
logger = logging.getLogger("space_advisor.stt_api")

@router.get("/status")
async def get_stt_engine_status():
    """
    Returns the current status of the Faster-Whisper Large-v3 engine.
    """
    model = get_whisper_model()
    is_gpu_ready = model is not None
    return {
        "engine": "Faster-Whisper Large-v3",
        "device": "NVIDIA GeForce RTX 5080 (CUDA 13.1)" if is_gpu_ready else "CPU/Standby",
        "is_ready": is_gpu_ready,
        "max_concurrent": 8,
        "supported_formats": [".m4a", ".wav", ".mp3", ".flac", ".ogg", ".webm"]
    }

@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Transcribes an uploaded audio file (.m4a, .wav, .mp3) using Faster-Whisper Large-v3.
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

@router.websocket("/ws")
async def stt_websocket_stream(websocket: WebSocket):
    """
    Live streaming WebSocket connection for real-time microphone / softphone audio chunks.
    """
    await websocket.accept()
    logger.info("⚡ [STT WebSocket] Client connected for live Faster-Whisper streaming.")
    try:
        while True:
            # Receive audio chunk (bytes)
            data = await websocket.receive_bytes()
            if data:
                # Transcribe chunk
                res = transcribe_audio_file(data, filename="chunk.wav")
                if res and res.get("full_transcript"):
                    await websocket.send_json({
                        "type": "transcript",
                        "text": res["full_transcript"],
                        "segments": res.get("segments", [])
                    })
    except WebSocketDisconnect:
        logger.info("🔌 [STT WebSocket] Client disconnected.")
    except Exception as e:
        logger.warning(f"⚠️ [STT WebSocket Error]: {e}")
