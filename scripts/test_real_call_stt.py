import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, r"d:\01.AntiGravity\Space_consult_assist\tools\ConsultParser")

from core.stt_engine import STTEngine

TEST_FILE = r"D:\스페이스_원본\20180503_135327_0424816008.m4a"

print(f"테스트 파일: {os.path.basename(TEST_FILE)} ({os.path.getsize(TEST_FILE):,} bytes)")

engine = STTEngine(whisper_model="custom-tiny-ko", device_setting="cuda")
text = engine.process_audio(TEST_FILE)

print("\n🎯 STT 전사 결과 (1분 30초 전체):")
print(text)
