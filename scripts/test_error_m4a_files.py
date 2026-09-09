import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, r"d:\01.AntiGravity\Space_consult_assist\tools\ConsultParser")

from core.stt_engine import STTEngine

test_files = [
    r"D:\스페이스_원본\20190613_114132_010-4497-4514_파싱실패.m4a",
    r"D:\스페이스_원본\20180713_163056_01023221542_파싱실패.m4a",
    r"D:\스페이스_원본\통화 녹음 01096796261_210621_203733.m4a",
]

print("==================================================================")
print("  🧪 오류 발생 3대 m4a 파일 STT 실전 변환 검증")
print("==================================================================")

engine = STTEngine(whisper_model="custom-tiny-ko", device_setting="cuda")

for p in test_files:
    if os.path.exists(p):
        print(f"\n🎧 파일: {os.path.basename(p)}")
        try:
            text = engine.process_audio(p)
            print("  ✅ 변환 성공!")
            lines = text.splitlines()
            print(f"  - 총 {len(lines)}행 생성됨 (첫 행: {lines[0] if lines else '빈 내용'})")
        except Exception as e:
            print(f"  ❌ 변환 실패: {e}")
    else:
        print(f"\n⚠️ 파일 없음: {p}")
