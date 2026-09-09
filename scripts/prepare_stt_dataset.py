import os
import sys
import glob
import re
import subprocess
import json
import time

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

AUDIO_DIR = r"D:\스페이스_테스트\completed_audio"
TEXT_DIR = r"D:\스페이스_테스트\stt_texts"
OUTPUT_DIR = r"d:\01.AntiGravity\Space_consult_assist\scripts\stt_data"
os.makedirs(OUTPUT_DIR, exist_ok=True)
CHUNKS_DIR = os.path.join(OUTPUT_DIR, "wav_chunks")
os.makedirs(CHUNKS_DIR, exist_ok=True)

# ffmpeg 경로
import imageio_ffmpeg
FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()

print("==================================================================")
print("  🎙️ Whisper-Tiny 파인튜닝용 30초 고정밀 오디오-텍스트 데이터셋 추출")
print("==================================================================")

# 1. 파일 목록 수집
audio_files = {os.path.splitext(os.path.basename(f))[0]: f for f in glob.glob(os.path.join(AUDIO_DIR, "*.m4a"))}
text_files = {os.path.splitext(os.path.basename(f))[0]: f for f in glob.glob(os.path.join(TEXT_DIR, "*.txt"))}

common_keys = sorted(list(set(audio_files.keys()) & set(text_files.keys())))
print(f"매칭된 오디오-텍스트 쌍: 총 {len(common_keys)}쌍 발견")

# 2. 타임스탬프 0초 ~ 28초 구간 파싱 함수
ts_pattern = re.compile(r"\[(\d{2}):(\d{2}):(\d{2})\]\s*(.*)")

def extract_first_30s_text(txt_path):
    collected_lines = []
    try:
        with open(txt_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                m = ts_pattern.match(line)
                if m:
                    h, mm, ss = int(m.group(1)), int(m.group(2)), int(m.group(3))
                    total_sec = h * 3600 + mm * 60 + ss
                    text_content = m.group(4).strip()
                    if total_sec < 28:
                        if text_content:
                            collected_lines.append(text_content)
                    else:
                        break
        return " ".join(collected_lines).strip()
    except Exception:
        return ""

dataset_samples = []
TARGET_COUNT = 300  # 빠른 고품질 PoC 학습용 300건

print(f"🎯 목표 샘플 수: {TARGET_COUNT}건 추출 중...")
t0 = time.time()

for k in common_keys:
    txt_path = text_files[k]
    m4a_path = audio_files[k]
    
    transcript = extract_first_30s_text(txt_path)
    # 최소 15자 이상, 의미 있는 한국어 발화가 있는 건만 선별
    if len(transcript) >= 20 and len(transcript) <= 200:
        out_wav = os.path.join(CHUNKS_DIR, f"{k}_0_28s.wav")
        
        # ffmpeg로 0~28초 구간 16kHz 모노 wav 추출 (초고속)
        if not os.path.exists(out_wav):
            cmd = [
                FFMPEG_EXE, "-y", "-ss", "0", "-t", "28",
                "-i", m4a_path,
                "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le",
                out_wav
            ]
            res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            if res.returncode != 0:
                continue
        
        dataset_samples.append({
            "audio_path": out_wav,
            "sentence": transcript,
            "duration": 28.0
        })
        
        if len(dataset_samples) % 50 == 0:
            print(f"  - 추출 진행: {len(dataset_samples)}/{TARGET_COUNT}건 ({time.time() - t0:.1f}초)")
            
        if len(dataset_samples) >= TARGET_COUNT:
            break

# 3. Train/Test 분할 (260 train, 40 test)
train_samples = dataset_samples[:260]
test_samples = dataset_samples[260:]

with open(os.path.join(OUTPUT_DIR, "train_stt.json"), "w", encoding="utf-8") as f:
    json.dump(train_samples, f, ensure_ascii=False, indent=2)

with open(os.path.join(OUTPUT_DIR, "test_stt.json"), "w", encoding="utf-8") as f:
    json.dump(test_samples, f, ensure_ascii=False, indent=2)

print(f"\n✅ 데이터셋 구축 완료! (총 {time.time() - t0:.1f}초)")
print(f"  - 학습용(Train): {len(train_samples)}건 ({os.path.join(OUTPUT_DIR, 'train_stt.json')})")
print(f"  - 검증용(Test) : {len(test_samples)}건 ({os.path.join(OUTPUT_DIR, 'test_stt.json')})")
if train_samples:
    print(f"  - 샘플 1:\n    오디오: {train_samples[0]['audio_path']}\n    발화문: {train_samples[0]['sentence']}")
