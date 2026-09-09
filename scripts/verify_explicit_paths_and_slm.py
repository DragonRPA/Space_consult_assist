import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, r"d:\01.AntiGravity\Space_consult_assist\tools\ConsultParser")

from core.file_scanner import scan_folder
from core.config_manager import load_config
from core.ollama_client import LocalSLMRunner
from core.parser import parse_llm_response

print("==================================================================")
print("  🧪 1. 4대 명시적 경로 기반 스캔 테스트")
print("==================================================================")

cfg = load_config()
input_dir = cfg.get("input_audio_dir", "D:/스페이스_원본")
stt_dir = cfg.get("stt_text_dir", "D:/스페이스_테스트/stt_texts")
comp_dir = cfg.get("completed_audio_dir", "D:/스페이스_테스트/completed_audio")
json_dir = cfg.get("result_json_dir", "D:/스페이스_테스트/result_json")

print(f"① 음성 원본: {input_dir}")
print(f"② 대화록 TXT: {stt_dir}")
print(f"③ 완료 음성: {comp_dir}")
print(f"④ 결과 JSON: {json_dir}")

items = scan_folder(
    input_folder=input_dir,
    output_folder="D:/스페이스_테스트",
    stt_text_dir=stt_dir,
    completed_audio_dir=comp_dir,
    result_json_dir=json_dir
)

audio_items = [i for i in items if i.file_type == "audio"]
txt_items = [i for i in items if i.file_type == "text" or i.stt_done]
stt_done = sum(1 for i in audio_items if i.stt_done)
json_done = sum(1 for i in items if i.json_done)

print(f"✅ 스캔 완료: 총 {len(items)}개 감지")
print(f"   - 음성 파일: {len(audio_items)}개 (STT 완료: {stt_done}개)")
print(f"   - 2단계 분석 대상: {len(txt_items)}개 (JSON 완료: {json_done}개)")

print("\n==================================================================")
print("  🧪 2. 중립화된 프롬프트로 SLM 증상 추론 검증 (세정수 편향 제거 확인)")
print("==================================================================")

prompt = cfg["prompt"]
runner = LocalSLMRunner.get_instance()

cases = [
    ("흡입 고장", "청소기 바닥에 오수 물 흡입이 전혀 안 돼요. 모터 소리는 나는데 스퀴지 쪽에 물이 그대로 흥건하게 남아있어요. 호스가 막혔는지 확인해봐야 할까요?"),
    ("배터리 방전", "충전기를 하루 종일 꽂아놨는데도 전원 키를 돌려도 아무 반응이 없고 켜지질 않아요. 배터리가 완전 방전된 것 같아요. 새 배터리로 교체해야 하나요?"),
    ("브러시 이상", "장비 주행은 잘 되는데 바닥 브러시가 전혀 회전하질 않습니다. 브러시 모터 쪽에서 탄 냄새도 심하게 나요.")
]

for label, text in cases:
    print(f"\n--- [증상 테스트: {label}] ---")
    resp = runner.generate(prompt, text)
    print(f"원문 응답:\n{resp}")
    from pathlib import Path
    parsed = parse_llm_response(resp, Path(f"{label}.txt"), "space-slm-0.5b:v2")
    print(f"파싱 결과: 통화유형={parsed.get('call_type')}, 증상={parsed.get('symptoms')}, 조치={parsed.get('actions')}, 요약={parsed.get('summary')}")
