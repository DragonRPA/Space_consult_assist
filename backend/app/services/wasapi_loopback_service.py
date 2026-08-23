"""
WASAPI Loopback Real-time STT Service
Windows 사운드 출력 장치(VB-CABLE 등)에서 실시간 오디오를 캡처하여
Faster-Whisper Large-v3-Turbo로 실시간 전사합니다.
"""

import os
import sys
import threading
import logging
import numpy as np
from typing import Callable, Optional
from math import gcd

# Register NVIDIA CUDA DLLs on Windows
if sys.platform == "win32":
    import site
    for sp in site.getsitepackages():
        for sub in ["nvidia/cublas/bin", "nvidia/cudnn/bin", "nvidia/cuda_nvrtc/bin"]:
            dll_dir = os.path.join(sp, sub.replace("/", os.sep))
            if os.path.isdir(dll_dir):
                try:
                    os.add_dll_directory(dll_dir)
                    os.environ["PATH"] = dll_dir + os.pathsep + os.environ.get("PATH", "")
                except Exception:
                    pass

logger = logging.getLogger("space_advisor.loopback")

# ── Audio Constants ──────────────────────────────────────────────────────────
CAPTURE_SAMPLE_RATE   = 48000   # WASAPI 기본 샘플레이트 (Hz)
WHISPER_SAMPLE_RATE   = 16000   # Faster-Whisper 요구 샘플레이트 (Hz)
CHUNK_SECONDS         = 2       # 청크 단위 (초)
CHUNK_FRAMES          = CAPTURE_SAMPLE_RATE * CHUNK_SECONDS
SILENCE_THRESHOLD_RMS = 0.004   # 에너지 기반 VAD: RMS 임계치 (무음 제거)


def resample_to_16k(audio: np.ndarray, orig_sr: int) -> np.ndarray:
    """stereo/mono float32 → mono 16kHz float32"""
    from scipy.signal import resample_poly
    # 다채널 → mono 다운믹스
    if audio.ndim > 1:
        audio = audio.mean(axis=1)
    audio = audio.astype(np.float32)
    # 최대치 클리핑 방지
    if np.max(np.abs(audio)) > 1.0:
        audio = audio / np.max(np.abs(audio))
    # 리샘플링
    g = gcd(orig_sr, WHISPER_SAMPLE_RATE)
    return resample_poly(audio, WHISPER_SAMPLE_RATE // g, orig_sr // g)


def list_loopback_devices() -> list[dict]:
    """사용 가능한 루프백 캡처 가능 장치 목록 반환"""
    try:
        import soundcard as sc
        devices = []
        for s in sc.all_speakers():
            devices.append({"id": str(s.name), "name": s.name})
        return devices
    except Exception as e:
        logger.error(f"Device list error: {e}")
        return []


def find_vb_cable_device():
    """VB-CABLE 가상 오디오 장치를 자동 탐색. 없으면 기본 스피커 반환."""
    try:
        import soundcard as sc
        vb_keywords = ['cable', 'vb-audio', 'virtual', 'vb cable']
        for speaker in sc.all_speakers():
            if any(kw in speaker.name.lower() for kw in vb_keywords):
                logger.info(f"VB-CABLE 장치 발견: {speaker.name}")
                return speaker
        default = sc.default_speaker()
        logger.warning(f"VB-CABLE 미발견 → 기본 스피커 사용: {default.name}")
        return default
    except Exception as e:
        logger.error(f"Device discovery error: {e}")
        return None


class LoopbackSTTService:
    """
    WASAPI Loopback 실시간 STT 서비스.
    백그라운드 스레드에서 오디오를 캡처하고
    segment_callback으로 전사 결과를 비동기 전달합니다.
    """

    def __init__(self):
        self._stop_event: threading.Event = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self._device_name: Optional[str] = None

    @property
    def is_running(self) -> bool:
        return self._thread is not None and self._thread.is_alive()

    def start(
        self,
        segment_callback: Callable[[dict], None],
        device_name: Optional[str] = None
    ):
        """루프백 캡처 스레드 시작"""
        if self.is_running:
            logger.warning("LoopbackSTTService already running")
            return

        self._stop_event.clear()
        self._device_name = device_name
        self._thread = threading.Thread(
            target=self._capture_loop,
            args=(segment_callback,),
            daemon=True,
            name="wasapi-loopback-stt"
        )
        self._thread.start()
        logger.info("LoopbackSTTService started")

    def stop(self):
        """루프백 캡처 스레드 중지"""
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=5)
            self._thread = None
        logger.info("LoopbackSTTService stopped")

    def _capture_loop(self, segment_callback: Callable[[dict], None]):
        """실제 WASAPI 루프백 캡처 + VAD + Whisper 추론 루프"""
        try:
            import soundcard as sc
            from app.services.stt_service import get_whisper_model

            model = get_whisper_model()
            if model is None:
                segment_callback({"error": "Faster-Whisper 모델 로드 실패"})
                return

            # 장치 탐색
            if self._device_name:
                target = next(
                    (s for s in sc.all_speakers() if s.name == self._device_name),
                    sc.default_speaker()
                )
            else:
                target = find_vb_cable_device()

            if target is None:
                segment_callback({"error": "오디오 캡처 장치를 찾을 수 없습니다"})
                return

            segment_callback({"status": "connected", "device": target.name})
            logger.info(f"WASAPI Loopback 캡처 장치: {target.name}")

            mic = sc.get_microphone(id=str(target.name), include_loopback=True)
            with mic.recorder(
                samplerate=CAPTURE_SAMPLE_RATE,
                channels=1,
                blocksize=4096
            ) as recorder:
                while not self._stop_event.is_set():
                    # 2초 청크 캡처
                    chunk = recorder.record(numframes=CHUNK_FRAMES)
                    audio_mono = chunk[:, 0] if chunk.ndim > 1 else chunk

                    # 에너지 기반 VAD: 무음 구간 스킵
                    rms = float(np.sqrt(np.mean(audio_mono.astype(np.float32) ** 2)))
                    if rms < SILENCE_THRESHOLD_RMS:
                        continue

                    # 16kHz 모노 리샘플링
                    audio_16k = resample_to_16k(audio_mono, CAPTURE_SAMPLE_RATE)

                    # Faster-Whisper 추론
                    segments, _info = model.transcribe(
                        audio_16k,
                        language="ko",
                        beam_size=3,
                        vad_filter=True,
                        condition_on_previous_text=False,
                    )

                    for seg in segments:
                        text = seg.text.strip()
                        if text:
                            segment_callback({
                                "text": text,
                                "start": round(seg.start, 2),
                                "end": round(seg.end, 2),
                            })

        except Exception as e:
            logger.error(f"LoopbackSTT capture error: {e}", exc_info=True)
            segment_callback({"error": str(e)})


# 글로벌 싱글턴
_loopback_service = LoopbackSTTService()


def get_loopback_service() -> LoopbackSTTService:
    return _loopback_service
