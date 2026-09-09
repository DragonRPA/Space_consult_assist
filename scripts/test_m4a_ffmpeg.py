import os
import sys
import subprocess
import numpy as np
import imageio_ffmpeg

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()

TEST_M4A = r"D:\스페이스_원본\20190613_114132_010-4497-4514_파싱실패.m4a"

# 만약 D:\스페이스_원본에 파일이 없으면 첫 번째 m4a 탐색
if not os.path.exists(TEST_M4A):
    import glob
    files = glob.glob(r"D:\스페이스_원본\*.m4a")
    if files:
        TEST_M4A = files[0]
    else:
        files = glob.glob(r"D:\스페이스_테스트\completed_audio\*.m4a")
        if files:
            TEST_M4A = files[0]

print(f"테스트 대상 m4a: {TEST_M4A}")

def load_audio_via_ffmpeg(file_path: str, sr: int = 16000) -> np.ndarray:
    cmd = [
        FFMPEG_EXE,
        "-nostdin",
        "-threads", "0",
        "-i", file_path,
        "-f", "s16le",
        "-ac", "1",
        "-ar", str(sr),
        "-"
    ]
    proc = subprocess.run(cmd, capture_output=True, check=True)
    return np.frombuffer(proc.stdout, np.int16).flatten().astype(np.float32) / 32768.0

audio_array = load_audio_via_ffmpeg(TEST_M4A)
print(f"✅ 오디오 로드 성공! 샘플 수: {len(audio_array)} ({len(audio_array)/16000:.1f}초 분량)")

# transformers pipeline 전사 테스트
sys.path.insert(0, r"d:\01.AntiGravity\Space_consult_assist\tools\ConsultParser")
from core.stt_engine import STTEngine

engine = STTEngine(whisper_model="custom-tiny-ko", device_setting="cuda")
engine.load_models_once()

out = engine._hf_pipeline(
    {"raw": audio_array, "sampling_rate": 16000},
    return_timestamps=True,
    generate_kwargs={"language": "korean", "task": "transcribe"}
)

print(f"전사 결과 텍스트: {out.get('text', '')[:100]}...")
print("청크 개수:", len(out.get("chunks", [])))
