"""
STT Router: Faster-Whisper Large-v3 Endpoints & WebSocket (Loopback + File)
"""

import asyncio
import os
import re
import logging
from fastapi import APIRouter, UploadFile, File, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.responses import JSONResponse, FileResponse
from app.services.stt_service import get_whisper_model
from app.services.wasapi_loopback_service import get_loopback_service, list_loopback_devices, RECORDINGS_DIR
from app.core.security import check_stt_rate_limit, get_current_user

router = APIRouter()
logger = logging.getLogger("space_advisor.stt_api")


@router.get("/status")
async def get_stt_engine_status():
    """Faster-Whisper 엔진 상태 및 루프백 캡처 가능 장치 목록 반환"""
    import ctranslate2
    model = get_whisper_model()
    is_gpu_ready = model is not None
    cuda_count = ctranslate2.get_cuda_device_count()
    loopback_svc = get_loopback_service()
    devices = list_loopback_devices()
    
    device_desc = f"CUDA / float16 (GPU x{cuda_count})" if cuda_count > 0 else "CPU / int8 (Fallback)"
    return {
        "engine": "Faster-Whisper Large-v3-Turbo",
        "device": device_desc if is_gpu_ready else "CPU/Standby",
        "is_ready": is_gpu_ready,
        "cuda_devices": cuda_count,
        "loopback_running": loopback_svc.is_running,
        "loopback_devices": devices,
        "max_concurrent": max(2, cuda_count * 4),
        "supported_formats": [".m4a", ".wav", ".mp3", ".flac", ".ogg", ".webm"]
    }


@router.get("/recordings")
async def list_recordings():
    """저장된 통화 녹음 파일 목록 반환"""
    os.makedirs(RECORDINGS_DIR, exist_ok=True)
    files = sorted(
        [f for f in os.listdir(RECORDINGS_DIR) if f.endswith(".wav")],
        reverse=True
    )
    return {"recordings": files, "count": len(files)}


from pathlib import Path

WINDOWS_RESERVED_NAMES = {"CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"}

@router.get("/recordings/{filename}")
async def download_recording(filename: str):
    """통화 녹음 파일 다운로드 (보안 하드닝: 경로 조작, DoS, 확장자 화이트리스트 검증)"""
    safe_name = os.path.basename(filename)
    stem = os.path.splitext(safe_name)[0].upper()
    if stem in WINDOWS_RESERVED_NAMES:
        raise HTTPException(status_code=400, detail="Invalid filename: Reserved system device name")

    if not re.match(r"^[a-zA-Z0-9_\-]+\.wav$", safe_name):
        raise HTTPException(status_code=400, detail="Invalid filename format (only .wav allowed)")

    base_dir = Path(RECORDINGS_DIR).resolve()
    target_path = (base_dir / safe_name).resolve()

    if not str(target_path).startswith(str(base_dir)) or not target_path.exists():
        raise HTTPException(status_code=404, detail="Recording not found")

    return FileResponse(
        path=str(target_path),
        filename=safe_name,
        media_type="audio/wav"
    )


import tempfile

@router.post("/reset")
async def reset_stt_session():
    """진행 중인 루프백 버퍼 및 세션 완전 초기화"""
    loopback_svc = get_loopback_service()
    loopback_svc.clear_buffer()
    return {"status": "cleared"}


import re as _re
from collections import Counter as _Counter

def _is_hallucination(text: str) -> bool:
    """
    Whisper 할루시네이션 패턴 감지:
    - oooo... 처럼 단일 문자 반복 (전체의 70% 이상)
    - 동일 문자 5회 이상 연속 (예: oooooo, 하하하하하)
    - 빈 문자열 또는 공백만
    """
    cleaned = text.strip()
    if not cleaned:
        return True
    # 단일 문자가 70% 이상인 경우
    counts = _Counter(cleaned)
    top_char, top_count = counts.most_common(1)[0]
    if len(cleaned) > 5 and top_count / len(cleaned) > 0.70:
        return True
    # 동일 문자 5회 이상 연속 반복
    if _re.search(r'(.)\1{4,}', cleaned):
        return True
    return False


def _sync_transcribe_file(model, audio_path: str):
    """별도 워커 스레드에서 실행되는 CTranslate2 동기 추론 함수 (이벤트 루프 차단 방지)"""
    segments, info = model.transcribe(
        audio_path,
        language="ko",
        beam_size=3,
        best_of=3,
        temperature=0.0,
        vad_filter=True,
        vad_parameters={"threshold": 0.35, "min_silence_duration_ms": 300},
        condition_on_previous_text=False,
    )
    
    result_segments = []
    full_lines = []
    last_text = None  # 연속 중복 감지용

    for seg in segments:
        text = seg.text.strip()
        if not text:
            continue
        # 1) 할루시네이션 필터 (oooo... 패턴)
        if _is_hallucination(text):
            continue
        # 2) no_speech_prob 필터 (잡음 구간)
        if hasattr(seg, 'no_speech_prob') and seg.no_speech_prob > 0.70:
            continue
        # 3) 연속 중복 필터 ("감사합니다" x4 방지)
        if text == last_text:
            continue
        last_text = text

        m = int(seg.start // 60)
        s = int(seg.start % 60)
        ts = f"[{m:02d}:{s:02d}]"
        line = f"{ts} {text}"
        full_lines.append(line)
        result_segments.append({
            "start": round(seg.start, 2),
            "end": round(seg.end, 2),
            "timestamp": ts,
            "text": text,
            "full_line": line
        })
    return result_segments, full_lines, info



@router.post("/transcribe-file", dependencies=[Depends(check_stt_rate_limit)])
async def transcribe_uploaded_audio_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    업로드된 음성 파일(.m4a, .mp3, .wav 등)을 Faster-Whisper Large-v3로 직접 고속 전사.
    asyncio.to_thread로 오프로딩하여 메인 이벤트 루프 프리즈 차단.
    """
    model = get_whisper_model()
    if model is None:
        raise HTTPException(status_code=500, detail="Faster-Whisper 모델을 초기화할 수 없습니다.")

    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB 제한 (DoS / OOM 방어)
    
    # Content-Type 검증 (Magic Number 수준은 백엔드 외부 검증 필요, Content-Type 1차 방어)
    ALLOWED_CONTENT_TYPES = {
        "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav",
        "audio/mp4", "audio/m4a", "audio/x-m4a", "audio/flac",
        "audio/ogg", "audio/webm", "video/webm", "application/octet-stream"
    }
    file_content_type = file.content_type or ""
    if file_content_type and file_content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail="지원하지 않는 파일 형식입니다. 지원 형식: m4a, mp3, wav, flac, ogg, webm"
        )

    suffix = os.path.splitext(file.filename or "audio.m4a")[1]
    if not suffix:
        suffix = ".m4a"

    total_bytes = 0
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        while True:
            chunk = await file.read(1024 * 1024)  # 1MB 청크 스트리밍
            if not chunk:
                break
            total_bytes += len(chunk)
            if total_bytes > MAX_FILE_SIZE:
                tmp.close()
                if os.path.exists(tmp.name):
                    os.remove(tmp.name)
                raise HTTPException(status_code=413, detail="파일 크기가 50MB를 초과하여 업로드할 수 없습니다.")
            tmp.write(chunk)
        tmp_path = tmp.name

    try:
        # 비동기 이벤트 루프를 마비시키지 않도록 스레드풀로 오프로딩
        result_segments, full_lines, info = await asyncio.to_thread(
            _sync_transcribe_file, model, tmp_path
        )

        return {
            "filename": file.filename,
            "duration": round(info.duration, 2),
            "language": info.language,
            "segments": result_segments,
            "full_transcript": "\n".join(full_lines),
            "count": len(result_segments)
        }
    except Exception as e:
        logger.error(f"File transcription error: {e}", exc_info=True)
        # 내부 에러 메시지 노출 방지 (정보 유출 차단)
        raise HTTPException(status_code=500, detail="음성 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.")
    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception as del_err:
                logger.warning(f"Temporary file delete error: {del_err}")



@router.websocket("/ws")
async def stt_loopback_websocket(websocket: WebSocket):
    """
    WASAPI Loopback 실시간 STT WebSocket.
    """
    await websocket.accept()
    logger.info("⚡ [STT-WS] Client connected for WASAPI Loopback real-time STT")

    loopback_svc = get_loopback_service()
    loop = asyncio.get_event_loop()

    def on_segment(segment: dict):
        """백그라운드 스레드 → WebSocket 비동기 전송"""
        try:
            future = asyncio.run_coroutine_threadsafe(
                websocket.send_json(segment),
                loop
            )
            # Future 완료 시 에러 로깅
            future.add_done_callback(lambda f: logger.debug(f"[STT-WS] Sent segment error: {f.exception()}") if f.exception() else None)
        except Exception as e:
            logger.debug(f"[STT-WS] Socket send error: {e}")

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

            elif action == "set_chunk":
                silence_s = float(msg.get("silence_seconds", 0.2))
                max_s = float(msg.get("max_seconds", 1.2))
                silence_s = max(0.1, min(silence_s, 5.0))
                max_s = max(0.3, min(max_s, 10.0))
                loopback_svc.set_chunk_params(silence_s, max_s)
                await websocket.send_json({
                    "status": "chunk_updated",
                    "silence_seconds": silence_s,
                    "max_seconds": max_s
                })

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
