import os
import sys
import time

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, r"d:\01.AntiGravity\Space_consult_assist\tools\ConsultParser")

from core.stt_engine import STTEngine
import subprocess
import numpy as np
import imageio_ffmpeg

FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()
TEST_LONG = r"D:\스페이스_원본\20180503_135327_0424816008.m4a"

engine = STTEngine(whisper_model="custom-tiny-ko", device_setting="cuda")
engine.load_models_once()

# 디코딩
cmd = [FFMPEG_EXE, "-nostdin", "-threads", "0", "-i", TEST_LONG, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"]
p = subprocess.run(cmd, capture_output=True, check=True)
waveform = np.frombuffer(p.stdout, np.int16).flatten().astype(np.float32) / 32768.0
total_sec = len(waveform) / 16000
print(f"오디오 길이: {total_sec:.1f}초")

t0 = time.time()
print("chunk_length_s=30 파이프라인 실행 중...")
out = engine._hf_pipeline(
    {"raw": waveform, "sampling_rate": 16000},
    chunk_length_s=30,
    stride_length_s=4,
    return_timestamps=True,
    generate_kwargs={"language": "korean", "task": "transcribe"}
)
elapsed = time.time() - t0
print(f"✅ 연산 완료! 소요 시간: {elapsed:.2f}초")

chunks = out.get("chunks", [])
print(f"총 청크 개수: {len(chunks)}개")
for c in chunks[:5]:
    print(f"  {c.get('timestamp')}: {c.get('text')}")
if len(chunks) > 5:
    print(f"  ... (중략) ...")
    print(f"  {chunks[-1].get('timestamp')}: {chunks[-1].get('text')}")
