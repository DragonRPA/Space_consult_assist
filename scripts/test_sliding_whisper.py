import os
import sys
import time
import torch
import numpy as np
import subprocess
import imageio_ffmpeg
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()
TEST_LONG = r"D:\스페이스_원본\20180503_135327_0424816008.m4a"
MODEL_PATH = r"d:\01.AntiGravity\Space_consult_assist\scripts\merged_whisper_tiny"

print("모델 로드 중...")
processor = AutoProcessor.from_pretrained(MODEL_PATH)
model = AutoModelForSpeechSeq2Seq.from_pretrained(
    MODEL_PATH,
    torch_dtype=torch.float16,
    device_map="cuda"
)

# 오디오 디코딩 (16kHz PCM)
cmd = [FFMPEG_EXE, "-nostdin", "-threads", "0", "-i", TEST_LONG, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"]
proc = subprocess.run(cmd, capture_output=True, check=True)
waveform = np.frombuffer(proc.stdout, np.int16).flatten().astype(np.float32) / 32768.0

total_sec = len(waveform) / 16000
print(f"오디오 길이: {total_sec:.1f}초")

# 30초 단위 청크 슬라이딩
CHUNK_SAMPLES = 16000 * 30
t0 = time.time()
lines = []

for offset in range(0, len(waveform), CHUNK_SAMPLES):
    chunk = waveform[offset:offset + CHUNK_SAMPLES]
    start_sec = offset / 16000
    
    # 0.5초 이하 너무 짧은 무음 잔여분 스킵
    if len(chunk) < 16000 * 0.5:
        continue

    inputs = processor(chunk, sampling_rate=16000, return_tensors="pt")
    input_features = inputs.input_features.to("cuda", dtype=torch.float16)

    with torch.no_grad():
        predicted_ids = model.generate(
            input_features,
            language="korean",
            task="transcribe",
            max_new_tokens=128
        )
    text = processor.batch_decode(predicted_ids, skip_special_tokens=True)[0].strip()
    if text:
        m, s = divmod(int(start_sec), 60)
        h, m = divmod(m, 60)
        ts_str = f"{h:02d}:{m:02d}:{s:02d}"
        lines.append(f"[{ts_str}] {text}")

elapsed = time.time() - t0
print(f"✅ 슬라이딩 전사 완료! 총 {len(lines)}행 생성 (소요 시간: {elapsed:.2f}초)")
for l in lines:
    print(f"  {l}")
