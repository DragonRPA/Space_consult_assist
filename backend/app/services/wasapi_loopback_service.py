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
SILENCE_THRESHOLD_RMS = 0.008   # 에너지 기반 VAD: RMS 임계치 (무음 제거)


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


RECORDINGS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "recordings")


class LoopbackSTTService:
    """
    WASAPI Loopback 실시간 STT 서비스.
    백그라운드 스레드에서 오디오를 캡처하고
    segment_callback으로 전사 결과를 비동기 전달합니다.
    통화 중 오디오를 누적하여 종료 시 .wav 파일로 저장합니다.
    """

    def __init__(self):
        self._stop_event: threading.Event = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self._device_name: Optional[str] = None
        self._chunk_seconds: float = 2.0
        # ── 녹음 버퍼 ───────────────────────────────────────────────────────
        self._recording_chunks: list = []   # 48kHz mono float32 청크 리스트
        self._last_recording_path: Optional[str] = None

    @property
    def is_running(self) -> bool:
        return self._thread is not None and self._thread.is_alive()

    @property
    def last_recording_path(self) -> Optional[str]:
        return self._last_recording_path

    def start(
        self,
        segment_callback: Callable[[dict], None],
        device_name: Optional[str] = None,
        chunk_seconds: float = 2.0
    ):
        """루프백 캡처 스레드 시작"""
        if self.is_running:
            logger.warning("LoopbackSTTService already running")
            return

        self._stop_event.clear()
        self._device_name = device_name
        self._chunk_seconds = max(0.3, float(chunk_seconds))
        self._recording_chunks = []          # 녹음 버퍼 초기화
        self._last_recording_path = None
        self._thread = threading.Thread(
            target=self._capture_loop,
            args=(segment_callback,),
            daemon=True,
            name="wasapi-loopback-stt"
        )
        self._thread.start()
        logger.info(f"LoopbackSTTService started (chunk={self._chunk_seconds}s)")

    def stop(self) -> Optional[str]:
        """루프백 캡처 스레드 중지 후 녹음 파일 저장. 저장된 파일명 반환."""
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=5)
            self._thread = None

        saved_path = self._save_recording()
        self._recording_chunks = []
        logger.info(f"LoopbackSTTService stopped. Recording: {saved_path}")
        return saved_path

    def _save_recording(self) -> Optional[str]:
        """누적된 청크를 .wav 파일로 저장. 저장 경로 반환."""
        if not self._recording_chunks:
            return None
        try:
            from scipy.io import wavfile
            from datetime import datetime

            os.makedirs(RECORDINGS_DIR, exist_ok=True)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{timestamp}_call_recording.wav"
            filepath = os.path.join(RECORDINGS_DIR, filename)

            audio = np.concatenate(self._recording_chunks, axis=0)
            audio_int16 = np.clip(audio * 32767, -32768, 32767).astype(np.int16)
            wavfile.write(filepath, WHISPER_SAMPLE_RATE, audio_int16)

            self._last_recording_path = filepath
            logger.info(f"✅ 통화 녹음 저장 완료: {filepath} ({len(audio_int16)/WHISPER_SAMPLE_RATE:.1f}초)")
            return filename
        except Exception as e:
            logger.error(f"녹음 저장 실패: {e}", exc_info=True)
            return None

    def _capture_loop(self, segment_callback: Callable[[dict], None]):
        """실제 WASAPI 루프백 캡처 + VAD + Whisper 추론 루프"""
        try:
            import soundcard as sc
            from app.services.stt_service import get_whisper_model

            model = get_whisper_model()
            if model is None:
                segment_callback({"error": "Faster-Whisper 모델 로드 실패"})
                return

            chunk_frames = int(CAPTURE_SAMPLE_RATE * self._chunk_seconds)

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

            segment_callback({"status": "connected", "device": target.name, "chunk_seconds": self._chunk_seconds})
            logger.info(f"WASAPI Loopback 캡처 장치: {target.name} / 청크: {self._chunk_seconds}s")

            mic = sc.get_microphone(id=str(target.name), include_loopback=True)
            with mic.recorder(
                samplerate=CAPTURE_SAMPLE_RATE,
                channels=1,
                blocksize=4096
            ) as recorder:
                # ── WASAPI 버퍼 플러시 ────────────────────────────────────────
                # 레코더를 새로 열 때 이전 세션의 꼬리 오디오가 버퍼에 남아있을 수 있음.
                # 최초 1초 분량을 무조건 버려서 이전 통화의 마지막 단어 누출을 차단.
                _flush_frames = int(CAPTURE_SAMPLE_RATE * 1.0)
                recorder.record(numframes=_flush_frames)
                logger.info("WASAPI 초기 버퍼 플러시 완료 (1초 폐기)")

                while not self._stop_event.is_set():
                    chunk = recorder.record(numframes=chunk_frames)
                    audio_mono = chunk[:, 0] if chunk.ndim > 1 else chunk
                    audio_mono = audio_mono.astype(np.float32)

                    # ── 녹음 버퍼 누적 (무음 포함 전체 통화 저장) ──────────────
                    self._recording_chunks.append(audio_mono.copy())

                    rms = float(np.sqrt(np.mean(audio_mono ** 2)))
                    if rms < SILENCE_THRESHOLD_RMS:
                        continue  # STT는 스킵, 녹음은 이미 누적됨

                    audio_16k = resample_to_16k(audio_mono, CAPTURE_SAMPLE_RATE)

                    segments, _info = model.transcribe(
                        audio_16k,
                        language="ko",
                        beam_size=3,
                        # ── 컨텍스트 완전 초기화 ─────────────────────────────────
                        # initial_prompt="": 이전 transcribe() 호출의 암묵적 컨텍스트를
                        # 명시적으로 초기화. "직전 마지막 단어 누출" 현상 차단.
                        initial_prompt="",
                        # ── 환각(Hallucination) 억제 파라미터 ───────────────────
                        # no_speech_threshold: 이 값 이상의 무음 확률이면 세그먼트 전체 버림
                        no_speech_threshold=0.6,
                        # log_prob_threshold: 평균 로그확률이 이 값 미만이면 버림 (낮을수록 엄격)
                        log_prob_threshold=-1.0,
                        # compression_ratio_threshold: 반복 텍스트(환각) 감지 후 버림
                        compression_ratio_threshold=2.4,
                        # vad_parameters: Silero VAD 내부 임계값 상향 (더 엄격한 음성 감지)
                        vad_filter=True,
                        vad_parameters={"threshold": 0.5, "min_silence_duration_ms": 300},
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
