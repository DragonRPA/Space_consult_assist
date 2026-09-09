import os
import sys
import json
import time
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, "scripts", "merged_qwen_0.5b")

def main():
    print("==================================================")
    print(" Space Advisor — 파인튜닝 Qwen2.5-0.5B 실시간 테스트")
    print("==================================================")
    print(f"모델 로드 중... ({MODEL_DIR})")
    
    tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR, use_fast=True)
    dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_DIR,
        dtype=dtype,
        device_map="auto"
    )
    model.eval()
    print("모델 로드 완료! (종료하려면 'exit' 또는 'q' 입력)\n")

    # 1회성 인자가 있는 경우 (예: python scripts/interactive_test.py "문장")
    if len(sys.argv) > 1:
        user_input = " ".join(sys.argv[1:])
        process_text(model, tokenizer, user_input)
        return

    # 대화형 프롬프트 루프
    while True:
        try:
            print("-" * 50)
            user_input = input("고객 증상 발화 입력 > ").strip()
            if not user_input:
                continue
            if user_input.lower() in ["exit", "quit", "q"]:
                print("테스트를 종료합니다.")
                break
            
            process_text(model, tokenizer, user_input)
        except (KeyboardInterrupt, EOFError):
            print("\n테스트를 종료합니다.")
            break

def process_text(model, tokenizer, user_input):
    input_messages = [
        {
            "role": "system",
            "content": (
                "너는 바닥 청소장비 A/S 상담 전문 분류기다. "
                "고객 발화에서 핵심 증상 키워드와 18개 표준 부품코드"
                "(SALES_INQUIRY, SCHEDULE_DELIVERY, SUCTION, POWER, DRIVE_BRUSH, "
                "WATER_SOLENOID, CHASSIS, WATER_NO_FLOW, BRUSH_WIRE, BRUSH_COVER, "
                "FORWARD_FAIL, WATER_SUPPLY_FAIL, BRUSH_FAIL, CHARGER_FAIL, POWER_FAIL, "
                "CHARGE_INDICATOR, INQUIRY_ETC, IRRELEVANT) 중 하나를 매핑하여 오직 JSON 형식으로만 응답하라."
            )
        },
        {"role": "user", "content": user_input}
    ]

    text = tokenizer.apply_chat_template(input_messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer([text], return_tensors="pt").to(model.device)

    start_t = time.time()
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=48,
            do_sample=False,
            pad_token_id=tokenizer.eos_token_id
        )
    elapsed_ms = int((time.time() - start_t) * 1000)

    generated_ids = outputs[0][inputs.input_ids.shape[1]:]
    response_text = tokenizer.decode(generated_ids, skip_special_tokens=True).strip()

    print(f"\n[추론 속도]: {elapsed_ms} ms")
    print(f"[모델 응답]: {response_text}")

    # 후처리 정규화 (18대 표준 부품코드로 매핑 보정)
    normalized_pcode = normalize_part_code(response_text)
    if normalized_pcode:
        print(f"[정규화 매핑]: -> {normalized_pcode}")
    print()

def normalize_part_code(raw_json_str):
    """0.5B의 파생 접미사(_FAIL 등)를 18대 표준 부품코드로 매핑"""
    try:
        data = json.loads(raw_json_str)
        pcode = data.get("part_code", "").upper()
        
        # 18대 표준 코드 정의
        STANDARD_CODES = [
            "SALES_INQUIRY", "SCHEDULE_DELIVERY", "SUCTION", "POWER", "DRIVE_BRUSH",
            "WATER_SOLENOID", "CHASSIS", "WATER_NO_FLOW", "BRUSH_WIRE", "BRUSH_COVER",
            "FORWARD_FAIL", "WATER_SUPPLY_FAIL", "BRUSH_FAIL", "CHARGER_FAIL", "POWER_FAIL",
            "CHARGE_INDICATOR", "INQUIRY_ETC", "IRRELEVANT"
        ]
        
        if pcode in STANDARD_CODES:
            return pcode
            
        if "SOLENOID" in pcode:
            return "WATER_SOLENOID"
        if "BRUSH" in pcode and "WIRE" in pcode:
            return "BRUSH_WIRE"
        if "BRUSH" in pcode:
            return "DRIVE_BRUSH"
        if "POWER" in pcode or "CHARGE" in pcode:
            return "POWER"
        if "WATER" in pcode:
            return "WATER_NO_FLOW"
        if "CHASSIS" in pcode:
            return "CHASSIS"
        if "INQUIRY" in pcode:
            return "INQUIRY_ETC"
            
        return pcode
    except Exception:
        return None

if __name__ == "__main__":
    main()
