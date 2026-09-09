import os
import sys
import torch
from transformers import pipeline

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

import imageio_ffmpeg
ffmpeg_dir = os.path.dirname(imageio_ffmpeg.get_ffmpeg_exe())
if ffmpeg_dir not in os.environ.get("PATH", ""):
    os.environ["PATH"] = ffmpeg_dir + os.path.pathsep + os.environ.get("PATH", "")

MODEL_PATH = r"d:\01.AntiGravity\Space_consult_assist\scripts\merged_whisper_tiny"
TEST_AUDIO = r"d:\01.AntiGravity\Space_consult_assist\scripts\stt_data\wav_chunks\20180518_102524_01020313417_파싱실패_0_28s.wav"

print("Transformers pipeline으로 merged_whisper_tiny 타임스탬프 전사 테스트 중...")
pipe = pipeline(
    "automatic-speech-recognition",
    model=MODEL_PATH,
    device=0 if torch.cuda.is_available() else -1,
    torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32
)

import soundfile as sf
waveform, sr = sf.read(TEST_AUDIO)
if len(waveform.shape) > 1:
    waveform = waveform.mean(axis=1)
if sr != 16000:
    import librosa
    waveform = librosa.resample(waveform, orig_sr=sr, target_sr=16000)

result = pipe(
    {"raw": waveform.astype("float32"), "sampling_rate": 16000},
    return_timestamps=True,
    generate_kwargs={"language": "korean", "task": "transcribe"}
)

print("\n전사 결과:")
print(f"전체 텍스트: {result['text']}")
print("\n청크 타임스탬프:")
for c in result.get("chunks", []):
    ts = c.get("timestamp", (0, 0))
    print(f"[{ts[0]:.1f}s ~ {ts[1]:.1f}s] {c.get('text', '')}")
