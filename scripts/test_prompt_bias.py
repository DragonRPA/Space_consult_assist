import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, r"d:\01.AntiGravity\Space_consult_assist\tools\ConsultParser")

from core.ollama_client import LocalSLMRunner
from core.config_manager import load_config

runner = LocalSLMRunner.get_instance()

# 3가지 서로 다른 증상 발화
test_cases = [
    ("흡입 고장", "네 안녕하세요. 청소기 바닥에 오수 물 흡입이 전혀 안 돼요. 모터 소리는 나는데 스퀴지 쪽에 물이 그대로 남아있어요."),
    ("배터리 방전", "충전기를 하루 종일 꽂아놨는데도 전원 키를 돌려도 아무 반응이 없고 켜지질 않아요. 배터리가 완전 방전된 것 같아요."),
    ("브러시 회전불량", "주행은 잘 되는데 바닥 브러시가 전혀 회전하질 않습니다. 브러시 모터가 탄 냄새도 좀 나는 것 같고요.")
]

# 1. 현재 ConsultParser 기본 프롬프트 (세정수 예시 포함)
cfg = load_config()
prompt_with_example = cfg["prompt"]

# 2. 예시 없는 순수 스키마 프롬프트 (학습 프롬프트)
prompt_clean = """너는 바닥 청소장비 고객 상담 전문 분석기다. 통화 녹취록을 면밀히 분석하여 오직 순수 JSON 형식으로만 응답하라.

[통화유형 분류 기준]
- "기술문의": 장비 고장, 이상 증상, A/S 요청, 수리, 부품 교체/누수
- "영업문의": 장비 구매, 임대/렌탈 단가, 견적서, 카탈로그, 사양 문의
- "일정조율": 장비 납품/배송 일정, 회수 일정, 기사 방문 시간 조율
- "기타": 단순 연락처, 부서 안내, 개인 잡담, 잘못 걸려온 전화

[응답 JSON 스키마]
{"통화유형": "기술문의", "증상목록": [{"계통분류": "흡입계통/배터리전원/브러시구동/급수세제 등", "핵심어구": "고객발화", "세부증상": "요약"}], "조치목록": [{"조치유형": "유선자가조치/정비사현장방문 등", "조치내용": "내용", "처리결과": "결과"}], "한줄요약": "요약문"}"""

print("==================================================================")
print("  🧪 프롬프트에 따른 SLM 증상 추론 결과 비교")
print("==================================================================")

for label, text in test_cases:
    print(f"\n==================== [테스트: {label}] ====================")
    print(f"발화: {text}")
    
    print("\n--- A. 현재 거대 프롬프트 (세정수 예시 포함) ---")
    resp_a = runner.generate(prompt_with_example, text)
    print(resp_a)
    
    print("\n--- B. 순수 스키마 프롬프트 (세정수 예시 제거) ---")
    resp_b = runner.generate(prompt_clean, text)
    print(resp_b)
