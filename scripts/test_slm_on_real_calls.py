import os
import sys
import glob
import json
import time
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

MODEL_PATH = r"d:\01.AntiGravity\Space_consult_assist\scripts\merged_qwen_0.5b"
TEXT_DIR = r"D:\스페이스_테스트\stt_texts"

print("==================================================================")
print("  🚀 훈련된 초경량 SLM (Qwen2.5-0.5B) - 실제 상담 녹취록 추론 테스트")
print("==================================================================")

# 1. 모델 로드
print(f"📦 모델 로딩 중: {MODEL_PATH} ...")
t0 = time.time()
tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
model = AutoModelForCausalLM.from_pretrained(
    MODEL_PATH,
    dtype=torch.bfloat16,
    device_map="cuda"
)
print(f"✅ 모델 로드 완료 ({time.time() - t0:.2f}초) | GPU VRAM 사용량: {torch.cuda.memory_allocated() / (1024**3):.2f} GB")

# 2. 실제 통화 텍스트 5건 선정
txt_files = sorted(glob.glob(os.path.join(TEXT_DIR, "*.txt")))
# 너무 짧은 파일 제외하고 200자~1000자 사이의 실제 상담 내용 선정
sample_files = []
for f in txt_files:
    try:
        with open(f, "r", encoding="utf-8") as fp:
            c = fp.read().strip()
        if 150 <= len(c) <= 800:
            sample_files.append((f, c))
        if len(sample_files) >= 5:
            break
    except Exception:
        continue

print(f"\n📂 테스트 대상 실제 통화록: {len(sample_files)}건 선정 완료\n")

# 3. 추론 실행
system_prompt = "너는 바닥 청소장비 A/S 상담 전문 분류기다. 고객 발화에서 핵심 증상 키워드와 18개 표준 부품코드(SALES_INQUIRY, SCHEDULE_DELIVERY, SUCTION, POWER, DRIVE_BRUSH, WATER_SOLENOID, CHASSIS, WATER_NO_FLOW, BRUSH_WIRE, BRUSH_COVER, FORWARD_FAIL, WATER_SUPPLY_FAIL, BRUSH_FAIL, CHARGER_FAIL, POWER_FAIL, CHARGE_INDICATOR, INQUIRY_ETC, IRRELEVANT) 중 하나를 매핑하여 오직 JSON 형식으로만 응답하라."

for i, (fpath, content) in enumerate(sample_files, 1):
    fname = os.path.basename(fpath)
    print(f"------------------------------------------------------------------")
    print(f"[{i}/5] 파일명: {fname} (본문 길이: {len(content)}자)")
    print(f"📄 녹취록 발췌:\n{content[:200]}...")
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": content}
    ]
    prompt = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    
    inputs = tokenizer(prompt, return_tensors="pt").to("cuda")
    
    t_start = time.time()
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=128,
            temperature=0.1,
            do_sample=False,
            pad_token_id=tokenizer.eos_token_id
        )
    latency_ms = (time.time() - t_start) * 1000
    
    generated_ids = outputs[0][inputs.input_ids.shape[1]:]
    response_text = tokenizer.decode(generated_ids, skip_special_tokens=True).strip()
    
    print(f"⚡ 추론 시간: {latency_ms:.1f}ms")
    print(f"🤖 0.5B 모델 출력:")
    print(response_text)
    print()

print("==================================================================")
print("  🎯 실시간 추론 테스트 완료")
print("==================================================================")
