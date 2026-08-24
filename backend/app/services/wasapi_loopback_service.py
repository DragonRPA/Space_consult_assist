"""
WASAPI Loopback Real-time STT Service
Windows 사운드 출력 장치(VB-CABLE 등)에서 실시간 오디오를 캡처하여
Faster-Whisper Large-v3-Turbo로 실시간 전사합니다.
"""

import os
import re
import sys
import time
import threading
import queue
import logging
import numpy as np
from collections import Counter
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
SILENCE_THRESHOLD_RMS = 0.0005  # 초민감도 에너지 VAD (조용한 전화 통화 및 짧은 추임새 무누락 포착)



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
    """사용 가능한 캡처 가능 장치 목록 반환 (CABLE Output 및 스피커 루프백)"""
    try:
        import soundcard as sc
        devices = []
        # 1. CABLE Output 가상 녹음 장치
        for m in sc.all_microphones(include_loopback=False):
            if "cable output" in m.name.lower():
                devices.append({"id": str(m.name), "name": f"VB-CABLE ({m.name})"})
        # 2. 물리 스피커 루프백
        for m in sc.all_microphones(include_loopback=True):
            if m.isloopback:
                devices.append({"id": str(m.name), "name": f"루프백 ({m.name})"})
        # 3. 기타 마이크
        for m in sc.all_microphones(include_loopback=False):
            if "cable output" not in m.name.lower():
                devices.append({"id": str(m.name), "name": f"마이크 ({m.name})"})
        return devices
    except Exception as e:
        logger.error(f"Device list error: {e}")
        return []


def find_vb_cable_device():
    """CABLE Output 가상 오디오 장치 자동 탐색. 없으면 스피커 루프백 반환."""
    try:
        import soundcard as sc
        # 1순위: CABLE Output (VB-Audio Virtual Cable 표준 녹음단)
        for m in sc.all_microphones(include_loopback=False):
            if "cable output" in m.name.lower():
                logger.info(f"✅ CABLE Output 가상 녹음 장치 연결: {m.name}")
                return m

        # 2순위: 물리 스피커 WASAPI 루프백 (Realtek 등)
        for m in sc.all_microphones(include_loopback=True):
            if m.isloopback and "realtek" in m.name.lower():
                logger.info(f"✅ Realtek 스피커 루프백 연결: {m.name}")
                return m

        # 3순위: 기본 마이크
        default_m = sc.default_microphone()
        logger.warning(f"기본 마이크 사용: {default_m.name if default_m else 'None'}")
        return default_m
    except Exception as e:
        logger.error(f"Device discovery error: {e}")
        return None


RECORDINGS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "recordings")


class LoopbackSTTService:
    """
    WASAPI Loopback 실시간 STT 서비스 (Queue-based Multi-threaded Pipeline).
    1. Capture Thread (Producer): WASAPI에서 0.1초 단위로 무휴(Continuous) 수음 → queue에 무누락 push.
    2. Inference Worker (Consumer): queue에서 오디오 수신 → 스마트 VAD 문장 결합 → Faster-Whisper GPU 전사.
    Whisper 추론 중에도 캡처는 1ms도 끊기지 않고 100% 무누락 연속 수음됩니다.
    """

    def __init__(self):
        self._stop_event: threading.Event = threading.Event()
        self._capture_thread: Optional[threading.Thread] = None
        self._worker_thread: Optional[threading.Thread] = None
        self._device_name: Optional[str] = None
        self._chunk_seconds: float = 2.0
        self._capture_reset_event: threading.Event = threading.Event()
        self._worker_reset_event: threading.Event = threading.Event()
        self._audio_queue: queue.Queue = queue.Queue(maxsize=1000)
        # ── 청크 파라미터 (런타임 동적 변경 가능) ─────────────────────────────
        self._silence_threshold_chunks: int = 2   # 0.1s 단위; 2 = 0.2s 무음 시 전사
        self._max_speech_chunks: int = 12          # 0.1s 단위; 12 = 1.2s 최대 연속 발화
        # ── 녹음 버퍼 (메모리 상한선 & 스레드 락 보호) ───────────────────────────
        self._chunks_lock: threading.Lock = threading.Lock()
        self._max_recording_chunks: int = 18000  # 최대 30분 분량 (메모리 누수 방어)
        self._recording_chunks: list = []        # 48kHz mono float32 청크 리스트
        self._last_recording_path: Optional[str] = None

    @property
    def is_running(self) -> bool:
        return self._capture_thread is not None and self._capture_thread.is_alive()

    @property
    def last_recording_path(self) -> Optional[str]:
        return self._last_recording_path

    def clear_buffer(self):
        """진행 중인 세션의 음성 버퍼를 즉시 리셋 (통화 전환, 파일 교체 시)"""
        self._capture_reset_event.set()
        self._worker_reset_event.set()
        with self._chunks_lock:
            self._recording_chunks.clear()
        # 잔여 큐 비우기
        while not self._audio_queue.empty():
            try:
                self._audio_queue.get_nowait()
            except queue.Empty:
                break
        logger.info("🧹 [LoopbackSTT] 버퍼 및 큐 클리어 완료")

    def set_chunk_params(self, silence_seconds: float, max_seconds: float):
        """청크 파라미터 런타임 변경 (재시작 불필요). GIL 보호로 스레드 안전."""
        self._silence_threshold_chunks = max(1, round(silence_seconds / 0.1))
        self._max_speech_chunks = max(3, round(max_seconds / 0.1))
        logger.info(f"⚙️ [LoopbackSTT] 청크 파라미터 변경: 무음={self._silence_threshold_chunks}청크({silence_seconds:.1f}s), 최대={self._max_speech_chunks}청크({max_seconds:.1f}s)")

    def start(
        self,
        segment_callback: Callable[[dict], None],
        device_name: Optional[str] = None,
        chunk_seconds: float = 2.0
    ):
        """루프백 캡처 스레드 & 추론 워커 시작"""
        if self.is_running:
            logger.warning("LoopbackSTTService already running - resetting buffer")
            self.clear_buffer()
            return

        self._stop_event.clear()
        self._reset_requested = False
        self._device_name = device_name
        self._chunk_seconds = max(0.3, float(chunk_seconds))
        self._recording_chunks = []          # 녹음 버퍼 초기화
        self._last_recording_path = None
        self._audio_queue = queue.Queue(maxsize=1000)

        # 1. Inference Consumer Thread
        self._worker_thread = threading.Thread(
            target=self._inference_worker,
            args=(segment_callback,),
            daemon=True,
            name="whisper-inference-worker"
        )
        self._worker_thread.start()

        # 2. Capture Producer Thread
        self._capture_thread = threading.Thread(
            target=self._capture_loop,
            args=(segment_callback,),
            daemon=True,
            name="wasapi-loopback-capture"
        )
        self._capture_thread.start()
        logger.info(f"✅ LoopbackSTTService started (Capture + Inference Queue Pipeline)")

    def stop(self) -> Optional[str]:
        """루프백 캡처 스레드 중지 후 녹음 파일 저장. 저장된 파일명 반환."""
        self._stop_event.set()
        if self._capture_thread:
            self._capture_thread.join(timeout=3)
            self._capture_thread = None
        if self._worker_thread:
            self._worker_thread.join(timeout=3)
            self._worker_thread = None

        saved_path = self._save_recording()
        with self._chunks_lock:
            self._recording_chunks.clear()
        logger.info(f"LoopbackSTTService stopped. Recording: {saved_path}")
        return saved_path

    def _save_recording(self) -> Optional[str]:
        """누적된 청크를 .wav 파일로 저장 (수음 샘플레이트 48kHz 원본 보존). 저장 경로 반환."""
        with self._chunks_lock:
            if not self._recording_chunks:
                return None
            chunks_to_save = list(self._recording_chunks)

        try:
            from scipy.io import wavfile
            from datetime import datetime

            os.makedirs(RECORDINGS_DIR, exist_ok=True)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{timestamp}_call_recording.wav"
            filepath = os.path.join(RECORDINGS_DIR, filename)

            audio = np.concatenate(chunks_to_save, axis=0)
            audio_int16 = np.clip(audio * 32767, -32768, 32767).astype(np.int16)
            # 48kHz 원본 수음 샘플레이트 그대로 저장 (3배속 왜곡 해결)
            wavfile.write(filepath, CAPTURE_SAMPLE_RATE, audio_int16)

            self._last_recording_path = filepath
            logger.info(f"✅ 통화 녹음 저장 완료: {filepath} ({len(audio_int16)/CAPTURE_SAMPLE_RATE:.1f}초, {CAPTURE_SAMPLE_RATE}Hz)")
            return filename
        except Exception as e:
            logger.error(f"녹음 저장 실패: {e}", exc_info=True)
            return None

    def _capture_loop(self, segment_callback: Callable[[dict], None]):
        """
        Producer Thread: WASAPI 오디오 캡처 전담.
        추론 속도와 무관하게 0.1초 단위로 continuous하게 큐에 공급하여 오디오 누락 0% 보장.
        """
        try:
            import soundcard as sc

            # 장치 탐색
            if self._device_name:
                target_mic = next(
                    (m for m in sc.all_microphones(include_loopback=True) if m.name == self._device_name or self._device_name in m.name),
                    None
                )
                if not target_mic:
                    target_mic = find_vb_cable_device()
            else:
                target_mic = find_vb_cable_device()

            if target_mic is None:
                segment_callback({"error": "오디오 캡처 장치를 찾을 수 없습니다"})
                return

            segment_callback({"status": "connected", "device": target_mic.name, "chunk_seconds": self._chunk_seconds})
            logger.info(f"🎤 [STT-Loopback] 캡처 장치 활성화: {target_mic.name} (is_loopback={target_mic.isloopback})")

            # 0.1초(4800 frames) 단위로 캡처하여 빠른 VAD 반응 & 큐 적재
            frames_per_capture = int(CAPTURE_SAMPLE_RATE * 0.1)
            total_captured_samples = 0

            with target_mic.recorder(
                samplerate=CAPTURE_SAMPLE_RATE,
                channels=1,
                blocksize=4096
            ) as recorder:
                # ── WASAPI 버퍼 플러시 (초기 0.5초 폐기) ──
                _flush_frames = int(CAPTURE_SAMPLE_RATE * 0.5)
                recorder.record(numframes=_flush_frames)
                logger.info("WASAPI 초기 버퍼 플러시 완료")

                while not self._stop_event.is_set():
                    if self._capture_reset_event.is_set():
                        self._capture_reset_event.clear()
                        # 버퍼 리셋 요청 시 샘플 카운터 초기화
                        total_captured_samples = 0
                        try:
                            recorder.record(numframes=frames_per_capture)
                        except Exception:
                            pass
                        continue

                    chunk = recorder.record(numframes=frames_per_capture)
                    audio_mono = chunk[:, 0] if chunk.ndim > 1 else chunk
                    audio_mono = audio_mono.astype(np.float32)

                    # 녹음 저장용 누적 (메모리 상한 보호)
                    with self._chunks_lock:
                        if len(self._recording_chunks) >= self._max_recording_chunks:
                            self._recording_chunks.pop(0)
                        self._recording_chunks.append(audio_mono.copy())

                    # (오디오 청크, 시작 샘플 인덱스) 튜플을 큐에 전달
                    sample_offset = total_captured_samples
                    total_captured_samples += len(audio_mono)

                    try:
                        self._audio_queue.put_nowait((audio_mono, sample_offset))
                    except queue.Full:
                        # 비정상적 적체 시 가장 오래된 것 1개 제거 후 삽입
                        try:
                            self._audio_queue.get_nowait()
                        except queue.Empty:
                            pass
                        self._audio_queue.put_nowait((audio_mono, sample_offset))

        except Exception as e:
            logger.error(f"LoopbackSTT capture thread error: {e}", exc_info=True)
            segment_callback({"error": f"캡처 오류: {str(e)}"})

    def _inference_worker(self, segment_callback: Callable[[dict], None]):
        """
        Consumer Thread: Queue에서 오디오 청크를 읽어 스마트 VAD 문장 결합 후 Faster-Whisper GPU 추론 수행.
        """
        try:
            from app.services.stt_service import get_whisper_model

            model = get_whisper_model()
            if model is None:
                segment_callback({"error": "Faster-Whisper 모델 로드 실패"})
                return

            speech_buffer: list[np.ndarray] = []
            speech_start_sample = 0
            silence_strikes = 0
            is_speech_active = False
            noise_floor = 0.0008               # 적응형 노이즈 플로어 초기값

            while not self._stop_event.is_set():
                if self._worker_reset_event.is_set():
                    self._worker_reset_event.clear()
                    speech_buffer = []
                    silence_strikes = 0
                    is_speech_active = False
                    noise_floor = 0.0008
                    segment_callback({"type": "stream_state", "streaming": False})
                    continue

                try:
                    audio_chunk, sample_offset = self._audio_queue.get(timeout=0.08)
                except queue.Empty:
                    continue

                rms = float(np.sqrt(np.mean(audio_chunk ** 2)))

                # 동적 노이즈 플로어 적응 (배경 화이트노이즈와 실제 발화 0.1초 정밀 구분)
                if not is_speech_active:
                    noise_floor = 0.92 * noise_floor + 0.08 * min(rms, noise_floor * 1.5)

                speech_threshold = max(0.0012, noise_floor * 1.8)

                if rms >= speech_threshold:
                    # 유효 음성 감지
                    if not is_speech_active:
                        is_speech_active = True
                        speech_start_sample = sample_offset
                        segment_callback({"type": "stream_state", "streaming": True})

                    speech_buffer.append(audio_chunk)
                    silence_strikes = 0
                else:
                    # 무음/휴지기 감지
                    if is_speech_active:
                        speech_buffer.append(audio_chunk)
                        silence_strikes += 1
                    else:
                        silence_strikes += 1
                        if silence_strikes > 15: # 1.5초 이상 무음
                            segment_callback({"type": "stream_state", "streaming": False})

                # 초저지연 전사 트리거 조건:
                # 무음 트리거 및 최대 청크 (set_chunk_params()로 런타임 변경 가능)
                trigger_stt = False
                is_forced_split = False

                if is_speech_active and silence_strikes >= self._silence_threshold_chunks and len(speech_buffer) > 0:
                    trigger_stt = True
                    is_forced_split = False
                elif is_speech_active and len(speech_buffer) >= self._max_speech_chunks:
                    trigger_stt = True
                    is_forced_split = True

                if trigger_stt:
                    sentence_audio = np.concatenate(speech_buffer)
                    
                    if is_forced_split:
                        # 0.2초(2청크)를 다음 버퍼로 유지하여 단어가 쪼개지지 않도록 연결
                        overlap_chunks = speech_buffer[-2:]
                        speech_buffer = list(overlap_chunks)
                        speech_start_sample = sample_offset - sum(len(c) for c in overlap_chunks)
                        silence_strikes = 0
                    else:
                        # 자연스러운 한마디 마침
                        speech_buffer = []
                        is_speech_active = False
                        silence_strikes = 0

                    # 최소 0.12초 이상이면 1음절/단문도 전부 전사
                    if len(sentence_audio) < int(CAPTURE_SAMPLE_RATE * 0.12):
                        continue

                    # 16kHz 리샘플링
                    audio_16k = resample_to_16k(sentence_audio, CAPTURE_SAMPLE_RATE)
                    chunk_base_sec = max(0.0, speech_start_sample / CAPTURE_SAMPLE_RATE)

                    try:
                        segments, _info = model.transcribe(
                            audio_16k,
                            language="ko",
                            beam_size=3,
                            best_of=3,
                            temperature=0.0,
                            initial_prompt=None,
                            no_speech_threshold=0.3,
                            log_prob_threshold=-1.0,
                            compression_ratio_threshold=2.4,
                            vad_filter=False,
                            condition_on_previous_text=False,
                        )

                        for seg in segments:
                            text = seg.text.strip()
                            if not text:
                                continue
                            # 1) 할루시네이션 필터 (oooo... 단일 문자 반복)
                            counts = Counter(text)
                            top_char, top_count = counts.most_common(1)[0]
                            if len(text) > 5 and top_count / len(text) > 0.70:
                                continue
                            if re.search(r'(.)\1{4,}', text):
                                continue
                            # 2) no_speech_prob 필터
                            if hasattr(seg, 'no_speech_prob') and seg.no_speech_prob > 0.65:
                                continue

                            seg_start_sec = chunk_base_sec + seg.start
                            m = int(seg_start_sec // 60)
                            s = int(seg_start_sec % 60)
                            timestamp_str = f"[{m:02d}:{s:02d}]"
                            segment_callback({
                                "text": text,
                                "timestamp": timestamp_str,
                                "full_line": f"{timestamp_str} {text}",
                                "start": round(seg_start_sec, 2),
                                "end": round(chunk_base_sec + seg.end, 2),
                            })

                    except Exception as infer_err:
                        logger.error(f"Whisper inference error: {infer_err}", exc_info=True)

        except Exception as e:
            logger.error(f"Inference worker thread error: {e}", exc_info=True)
            segment_callback({"error": f"추론 오류: {str(e)}"})


# 글로벌 싱글턴
_loopback_service = LoopbackSTTService()


def get_loopback_service() -> LoopbackSTTService:
    return _loopback_service

