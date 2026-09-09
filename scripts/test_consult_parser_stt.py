import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# ConsultParser 경로 추가
sys.path.insert(0, r"d:\01.AntiGravity\Space_consult_assist\tools\ConsultParser")

from core.stt_engine import STTEngine

TEST_AUDIO = r"d:\01.AntiGravity\Space_consult_assist\scripts\stt_data\wav_chunks\20180518_102524_01020313417_파싱실패_0_28s.wav"

print("==================================================================")
print("  🧪 ConsultParser STTEngine 'custom-tiny-ko' 통합 작동 테스트")
print("==================================================================")

engine = STTEngine(whisper_model="custom-tiny-ko", device_setting="cuda")

def progress_cb(pct, msg):
    print(f"  [{pct}%] {msg}")

result_text = engine.process_audio(TEST_AUDIO, progress_callback=progress_cb)

print("\n🎯 STT 전사 결과 (ConsultParser 출력 규격):")
print("------------------------------------------------------------------")
print(result_text)
print("------------------------------------------------------------------")
print(f"총 {len(result_text.splitlines())}행 생성 완료!")
