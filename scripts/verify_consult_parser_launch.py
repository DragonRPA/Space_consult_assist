import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, r"d:\01.AntiGravity\Space_consult_assist\tools\ConsultParser")

# main.py의 사전 로딩 루틴 실행
import main

from core.stt_engine import STTEngine

TEST_AUDIO = r"d:\01.AntiGravity\Space_consult_assist\scripts\stt_data\wav_chunks\20180518_102524_01020313417_파싱실패_0_28s.wav"

print("==================================================================")
print("  🧪 ConsultParser2 1단계 STT WinError 206 해결 검증")
print("==================================================================")

try:
    engine = STTEngine(whisper_model="custom-tiny-ko", device_setting="cuda")
    print("1. STTEngine 인스턴스 생성 완료")
    
    text = engine.process_audio(TEST_AUDIO)
    print("2. process_audio 실행 성공!")
    print("------------------------------------------------------------------")
    print(f"생성된 텍스트 첫 3행:\n" + "\n".join(text.splitlines()[:3]))
    print("------------------------------------------------------------------")
    print("✅ [WinError 206] 완전 해소 확인 성공!")
except Exception as e:
    import traceback
    print(f"❌ 여전히 오류 발생: {e}")
    traceback.print_exc()
