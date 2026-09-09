import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, r"d:\01.AntiGravity\Space_consult_assist\tools\ConsultParser")

from core.ollama_client import OllamaClient
from core.parser import parse_llm_response
from core.config_manager import get_default_prompt
from pathlib import Path

print("==================================================================")
print("  🧪 ConsultParser OllamaClient 'space-slm-0.5b-v2' 단독 검증")
print("==================================================================")

client = OllamaClient()

# 1. 모델 목록 확인
models = client.list_models()
print("📋 모델 목록 (상위 3개):")
for m in models[:3]:
    print(f"  - {m}")

# 2. 1건 테스트 생성
test_prompt = get_default_prompt()
sample_call = "네 여보세요? 세정수가 바닥에 전혀 안 나와요. 솔레노이드 밸브 문제인가요? 점검 부탁드립니다."

print("\n⚡ space-slm-0.5b-v2 추론 호출 중...")
raw_resp = client.generate(
    model="space-slm-0.5b-v2 (🇰🇷 자체 훈련 균형 모델 / VRAM 0.9GB)",
    prompt=test_prompt,
    content=sample_call
)

print("\n🎯 원본 LLM 응답:")
print(raw_resp)

# 3. parser.py 구조화 검증
parsed = parse_llm_response(raw_resp, Path("sample_call.txt"), "space-slm-0.5b-v2")
print("\n✅ 구조화 파싱 결과 (JSON):")
import json
print(json.dumps(parsed, ensure_ascii=False, indent=2))
