import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, r"d:\01.AntiGravity\Space_consult_assist\tools\ConsultParser")

from core.stt_engine import STTEngine
import subprocess
import numpy as np
import imageio_ffmpeg

FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()
TEST_LONG = r"D:\스페이스_원본\20180503_135327_0424816008.m4a"

# 오디오 길이 확인
cmd = [FFMPEG_EXE, "-i", TEST_LONG]
proc = subprocess.run(cmd, capture_output=True, text=True, errors="ignore")
for line in proc.stderr.splitlines():
    if "Duration:" in line:
        print(f"오디오 길이: {line.strip()}")

engine = STTEngine(whisper_model="custom-tiny-ko", device_setting="cuda")
engine.load_models_once()

# 디코딩
cmd = [FFMPEG_EXE, "-nostdin", "-threads", "0", "-i", TEST_LONG, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"]
p = subprocess.run(cmd, capture_output=True, check=True)
waveform = np.frombuffer(p.stdout, np.int16).flatten().astype(np.float32) / 32768.0
print(f"총 초수: {len(waveform)/16000:.1f}초")

# 1. chunk_length_s 없이 호출 시
out_no_chunk = engine._hf_pipeline(
    {"raw": waveform, "sampling_rate": 16000},
    return_timestamps=True,
    generate_kwargs={"language": "korean", "task": "transcribe"}
)
chunks1 = out_no_chunk.get("chunks", [])
print(f"\n[chunk_length_s 없음] 청크 개수: {len(chunks1)}")
if chunks1:
    print(f"  마지막 타임스탬프: {chunks1[-1].get('timestamp')}")

# 2. chunk_length_s=30 적용 시
out_with_chunk = engine._hf_pipeline(
    {"raw": waveform, "sampling_rate": 16000},
    chunk_length_s=30,
    stride_length_s=4,
    return_timestamps=True,
    generate_kwargs={"language": "korean", "task": "transcribe"}
)
chunks2 = out_with_chunk.get("chunks", [])
print(f"\n[chunk_length_s=30 적용] 청크 개수: {len(chunks2)}")
if chunks2:
    print(f"  마지막 타임스탬프: {chunks2[-1].get('timestamp')}")
