"""
core/stt_engine.py
OpenAI Whisper 오디오 STT 음성 인식 및 타임스탬프 대화록 텍스트 생성 엔진
"""
import os
import re
import json
import logging
import tempfile
import threading
from datetime import timedelta

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("STTEngine")

# static_ffmpeg & imageio_ffmpeg 바이너리 경로 자동 탐색 및 환경변수 설정
# static_ffmpeg & imageio_ffmpeg 바이너리 경로 자동 탐색 및 환경변수 설정
FFMPEG_EXE_PATH = "ffmpeg"
try:
    import static_ffmpeg
    static_ffmpeg.add_paths()
except Exception:
    pass

try:
    import imageio_ffmpeg
    import shutil
    FFMPEG_EXE_PATH = imageio_ffmpeg.get_ffmpeg_exe()
    ffmpeg_dir = os.path.dirname(FFMPEG_EXE_PATH)
    # funasr 등 외부 라이브러리에서 ffmpeg.exe를 직접 호출할 수 있도록 alias 보장
    alias_path = os.path.join(ffmpeg_dir, "ffmpeg.exe")
    if not os.path.exists(alias_path) and os.path.exists(FFMPEG_EXE_PATH):
        try:
            shutil.copy2(FFMPEG_EXE_PATH, alias_path)
        except Exception:
            pass
    if ffmpeg_dir not in os.environ.get("PATH", ""):
        os.environ["PATH"] = ffmpeg_dir + os.path.pathsep + os.environ.get("PATH", "")
    logger.info(f"FFmpeg binary path: {FFMPEG_EXE_PATH}")
except Exception:
    pass


# PyTorch 및 C++ 런타임 사전 안전 임포트 (스레드 내 WinError 206 원천 차단)
try:
    import torch
except Exception:
    pass


class STTEngine:
    """
    다중 음성인식(STT) 엔진: Faster-Whisper, Transformers Whisper 및 차세대 SenseVoice-Small 지원
    """

    def __init__(self, whisper_model: str = "base", device_setting: str = "auto", use_fp16: bool = False):
        self.whisper_model_name = whisper_model or "base"
        self.device_setting = device_setting or "auto"
        self.use_fp16 = use_fp16
        self.beam_size = 1

        self._whisper_model = None
        self._hf_processor = None
        self._hf_model = None
        self._is_hf_model = False
        self._sensevoice_model = None
        self._is_sensevoice = False
        self._loaded_model_name = None
        self._loaded_device = None
        self._transcribe_lock = threading.Lock()

        # 모델 저장 경로
        self.sensevoice_local_dir = r"D:\models\SenseVoiceSmall"
        candidates = [
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "scripts", "merged_whisper_tiny")),
            r"D:\01.AntiGravity\Space_consult_assist\scripts\merged_whisper_tiny",
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "scripts", "whisper_finetuned_tiny_ko")),
        ]
        self.custom_model_dir = candidates[0]
        for c in candidates:
            if os.path.exists(c):
                self.custom_model_dir = c
                break


    @staticmethod
    def get_gpu_info() -> dict:
        """시스템 GPU 및 CUDA 상태 감지"""
        try:
            import torch
            has_cuda = torch.cuda.is_available()
            if has_cuda:
                name = torch.cuda.get_device_name(0)
                vram_gb = round(torch.cuda.get_device_properties(0).total_memory / (1024**3), 1)
                return {"available": True, "name": name, "vram_gb": vram_gb, "count": torch.cuda.device_count()}
        except Exception:
            pass
        return {"available": False, "name": "CPU 전용 모드", "vram_gb": 0, "count": 0}

    @staticmethod
    def format_timestamp(seconds: float) -> str:
        td = timedelta(seconds=seconds)
        total_seconds = int(td.total_seconds())
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        secs = total_seconds % 60
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"

    def check_dependencies(self) -> dict:
        status = {"whisper": False, "torch": False, "transformers": False}
        try:
            import torch
            status["torch"] = True
        except ImportError:
            pass
        try:
            import whisper
            status["whisper"] = True
        except ImportError:
            pass
        try:
            import transformers
            status["transformers"] = True
        except ImportError:
            pass
        return status

    def load_models_once(self, progress_callback=None):
        """Whisper AI 모델을 메모리에 1회 싱글톤 로드 (스레드 세이프)"""
        import torch

        with self._transcribe_lock:
            if self.device_setting == "cuda" and torch.cuda.is_available():
                target_device = "cuda"
            elif self.device_setting == "cpu":
                target_device = "cpu"
            else:
                target_device = "cuda" if torch.cuda.is_available() else "cpu"

            if (self._whisper_model is not None or self._hf_model is not None or self._sensevoice_model is not None) and \
               self._loaded_model_name == self.whisper_model_name and self._loaded_device == target_device:
                return target_device

            # ── 1. SenseVoice-Small 차세대 비-Whisper 엔진인 경우 ──
            if "sensevoice" in self.whisper_model_name.lower():
                if progress_callback:
                    progress_callback(10, f"SenseVoice-Small 초고속 비-Whisper 엔진 로드 중 ({target_device.upper()})...")
                try:
                    from funasr import AutoModel
                    sv_path = self.sensevoice_local_dir if os.path.exists(self.sensevoice_local_dir) else "iic/SenseVoiceSmall"
                    self._sensevoice_model = AutoModel(
                        model=sv_path,
                        trust_remote_code=True,
                        device="cuda:0" if target_device == "cuda" else "cpu",
                        disable_update=True
                    )
                    self._is_sensevoice = True
                    self._is_hf_model = False
                    self._whisper_model = None
                    self._loaded_model_name = self.whisper_model_name
                    self._loaded_device = target_device
                    logger.info("SenseVoice-Small 엔진 로드 완료")
                    return target_device
                except Exception as e_sv:
                    logger.error(f"SenseVoice-Small 로드 실패: {e_sv}")
                    raise

            # ── 2. 한국어 특화 파인튜닝 모델인 경우 (HuggingFace Pipeline) ──
            is_custom = (
                any(k in self.whisper_model_name.lower() for k in ["custom", "korean", "merged", "tiny-ko"]) or
                os.path.isdir(self.whisper_model_name)
            )

            if is_custom:
                model_dir = self.whisper_model_name if os.path.isdir(self.whisper_model_name) else self.custom_model_dir
                if not os.path.exists(model_dir):
                    logger.warning(f"커스텀 모델 디렉토리 미발견: {model_dir}, 기본 base로 폴백합니다.")
                    self.whisper_model_name = "base"
                    is_custom = False
                else:
                    if progress_callback:
                        progress_callback(10, f"한국어 특화 Whisper-Tiny 모델 로드 중 ({target_device.upper()})...")
                    from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor
                    self._hf_processor = AutoProcessor.from_pretrained(model_dir)
                    self._hf_model = AutoModelForSpeechSeq2Seq.from_pretrained(
                        model_dir,
                        torch_dtype=torch.float16 if target_device == "cuda" else torch.float32,
                        device_map=target_device
                    )
                    self._whisper_model = None
                    self._sensevoice_model = None
                    self._is_hf_model = True
                    self._is_sensevoice = False
                    self._loaded_model_name = self.whisper_model_name
                    self._loaded_device = target_device
                    return target_device

            # ── 3. 표준 Faster-Whisper / Transformers Whisper 모델인 경우 ──
            if progress_callback:
                progress_callback(10, f"Faster-Whisper [{self.whisper_model_name}] 모델 로드 중 ({target_device.upper()})...")

            # 3-A. Faster-Whisper 우선 시도
            try:
                from faster_whisper import WhisperModel
                compute_type = "float16" if target_device == "cuda" else "int8"
                self._whisper_model = WhisperModel(self.whisper_model_name, device=target_device, compute_type=compute_type)
                self._hf_model = None
                self._hf_processor = None
                self._sensevoice_model = None
                self._is_hf_model = False
                self._is_sensevoice = False
                self._loaded_model_name = self.whisper_model_name
                self._loaded_device = target_device
                logger.info(f"Faster-Whisper [{self.whisper_model_name}] 로드 성공")
                return target_device
            except Exception as e_fw:
                logger.warning(f"Faster-Whisper 로드 실패/미지원 ({e_fw}), Transformers 파이프라인으로 안전 폴백합니다.")

            # 3-B. Transformers Whisper 안전 폴백
            try:
                from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor
                model_id = self.whisper_model_name if self.whisper_model_name.startswith("openai/") else f"openai/whisper-{self.whisper_model_name}"
                self._hf_processor = AutoProcessor.from_pretrained(model_id)
                self._hf_model = AutoModelForSpeechSeq2Seq.from_pretrained(
                    model_id,
                    torch_dtype=torch.float16 if target_device == "cuda" else torch.float32,
                    device_map=target_device
                )
                self._whisper_model = None
                self._sensevoice_model = None
                self._is_hf_model = True
                self._is_sensevoice = False
                self._loaded_model_name = self.whisper_model_name
                self._loaded_device = target_device
                logger.info(f"Transformers Whisper [{model_id}] 폴백 로드 성공")
                return target_device
            except Exception as e_hf:
                logger.error(f"Whisper 모델 로드 실패: {e_hf}")
                raise

    def process_audio(self, audio_path: str, progress_callback=None) -> str:
        """
        .m4a, .mp3, .wav 등 오디오 파일의 STT 음성 인식 및 타임스탬프 텍스트 반환
        """
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"오디오 파일을 찾을 수 없습니다: {audio_path}")

        target_device = self.load_models_once(progress_callback=progress_callback)

        if progress_callback:
            progress_callback(30, "음성 인식(STT) 연산 중...")

        # ── [A] SenseVoice-Small 초고속 병렬 전사 ──
        if self._is_sensevoice and self._sensevoice_model is not None:
            with self._transcribe_lock:
                if progress_callback:
                    progress_callback(40, "SenseVoice-Small 초고속 전사 중...")
                from funasr.utils.postprocess_utils import rich_transcription_postprocess
                res = self._sensevoice_model.generate(
                    input=audio_path,
                    cache={},
                    language="ko",
                    use_itn=True,
                    batch_size_s=60,
                    merge_vad=True,
                    merge_length_s=15,
                )
                raw_text = res[0]["text"] if res and len(res) > 0 else ""
                clean_text = rich_transcription_postprocess(raw_text).strip()
                lines = []
                if clean_text:
                    lines.append(f"[00:00:00] {clean_text}")

            if progress_callback:
                progress_callback(100, "STT 변환 완료")

            return "\n".join(lines)

        # ── [B] Faster-Whisper CTranslate2 전사 ──
        if self._whisper_model is not None:
            with self._transcribe_lock:
                if progress_callback:
                    progress_callback(50, "Faster-Whisper 전사 연산 중...")
                try:
                    segments, _ = self._whisper_model.transcribe(
                        audio_path,
                        language="ko",
                        beam_size=self.beam_size
                    )
                    lines = []
                    for seg in segments:
                        text = seg.text.strip()
                        if text:
                            time_str = self.format_timestamp(seg.start)
                            lines.append(f"[{time_str}] {text}")

                    if progress_callback:
                        progress_callback(100, "STT 변환 완료")

                    return "\n".join(lines)
                except Exception as e_fw_runtime:
                    logger.warning(f"Faster-Whisper 런타임 오류 ({e_fw_runtime}), Transformers 파이프라인으로 즉시 자동 전환합니다.")
                    from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor
                    import torch
                    model_id = f"openai/whisper-{self.whisper_model_name}" if not self.whisper_model_name.startswith("openai/") else self.whisper_model_name
                    self._hf_processor = AutoProcessor.from_pretrained(model_id)
                    self._hf_model = AutoModelForSpeechSeq2Seq.from_pretrained(
                        model_id,
                        torch_dtype=torch.float16 if target_device == "cuda" else torch.float32,
                        device_map=target_device
                    )
                    self._whisper_model = None
                    self._is_hf_model = True
                    # 아래 [C] 블록으로 자연스럽게 진행

        # ── [C] Transformers Whisper 슬라이딩 윈도우 전사 ──
        if self._is_hf_model and self._hf_model is not None:
            with self._transcribe_lock:
                import numpy as np
                import subprocess
                import torch

                cmd = [
                    FFMPEG_EXE_PATH,
                    "-nostdin",
                    "-threads", "0",
                    "-i", audio_path,
                    "-f", "s16le",
                    "-ac", "1",
                    "-ar", "16000",
                    "-"
                ]
                proc = subprocess.run(cmd, capture_output=True, check=True)
                waveform = np.frombuffer(proc.stdout, np.int16).flatten().astype(np.float32) / 32768.0
                CHUNK_SAMPLES = 16000 * 30
                lines = []
                target_dev = "cuda" if torch.cuda.is_available() else "cpu"
                dev_dtype = torch.float16 if target_dev == "cuda" else torch.float32

                total_chunks = max(1, (len(waveform) + CHUNK_SAMPLES - 1) // CHUNK_SAMPLES)

                for chunk_idx, offset in enumerate(range(0, len(waveform), CHUNK_SAMPLES)):
                    chunk = waveform[offset:offset + CHUNK_SAMPLES]
                    start_sec = offset / 16000
                    if len(chunk) < 16000 * 0.4:
                        continue

                    if progress_callback:
                        pct = int(30 + (chunk_idx / total_chunks) * 60)
                        progress_callback(pct, f"대화록 생성 중 ({chunk_idx+1}/{total_chunks} 구간)...")

                    inputs = self._hf_processor(chunk, sampling_rate=16000, return_tensors="pt")
                    input_features = inputs.input_features.to(target_dev, dtype=dev_dtype)

                    with torch.no_grad():
                        predicted_ids = self._hf_model.generate(
                            input_features,
                            language="korean",
                            task="transcribe",
                            max_new_tokens=128
                        )
                    chunk_text = self._hf_processor.batch_decode(predicted_ids, skip_special_tokens=True)[0].strip()
                    if chunk_text:
                        chunk_text = re.sub(r'(.{2,}?)\1{3,}', r'\1', chunk_text).strip()
                        if chunk_text:
                            lines.append(f"[{self.format_timestamp(start_sec)}] {chunk_text}")

            if progress_callback:
                progress_callback(100, "STT 변환 완료")

            return "\n".join(lines)

        raise RuntimeError("사용 가능한 STT 모델 인스턴스가 없습니다.")
