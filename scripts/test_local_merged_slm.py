import json
import os
import sys
import time
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# Space Consult Assist — 로컬 직접 추론 검증 스크립트

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, "scripts", "merged_qwen_0.5b")
TEST_PATH = os.path.join(BASE_DIR, "scripts", "dataset_test.jsonl")

def run_local_evaluation(sample_count=30):
    print(f"=== [파인튜닝된 Qwen2.5-0.5B 로컬 직접 추론 벤치마크] ===")
    print(f"모델 경로: {MODEL_DIR}")
    print(f"CUDA: {torch.cuda.is_available()} ({torch.cuda.get_device_name(0)})")
    
    # 1. 모델 및 토크나이저 로드
    print("\n모델 로드 중...")
    start_load = time.time()
    tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR, use_fast=True)
    dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_DIR,
        dtype=dtype,
        device_map="auto"
    )
    model.eval()
    print(f"모델 로드 완료: {time.time() - start_load:.2f}초")

    # 2. 테스트셋 로드
    test_samples = []
    with open(TEST_PATH, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                test_samples.append(json.loads(line))
            if len(test_samples) >= sample_count:
                break

    print(f"\n총 테스트 샘플 수: {len(test_samples)}건")
    print("-" * 55)

    latencies = []
    correct_pcode = 0
    valid_json = 0

    for idx, sample in enumerate(test_samples, 1):
        messages = sample["messages"]
        user_content = messages[1]["content"]
        expected = json.loads(messages[2]["content"])
        expected_pcode = expected["part_code"]

        input_messages = [
            {"role": "system", "content": "너는 바닥 청소장비 A/S 상담 전문 분류기다. 고객 발화에서 핵심 증상 키워드와 18개 표준 부품코드 중 하나를 매핑하여 오직 JSON 형식으로만 응답하라."},
            {"role": "user", "content": user_content}
        ]

        text = tokenizer.apply_chat_template(input_messages, tokenize=False, add_generation_prompt=True)
        inputs = tokenizer([text], return_tensors="pt").to(model.device)

        start_t = time.time()
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=48,
                temperature=0.1,
                top_p=0.9,
                do_sample=False,
                pad_token_id=tokenizer.eos_token_id
            )
        elapsed_ms = int((time.time() - start_t) * 1000)
        latencies.append(elapsed_ms)

        # 응답 추출
        generated_ids = outputs[0][inputs.input_ids.shape[1]:]
        response_text = tokenizer.decode(generated_ids, skip_special_tokens=True).strip()

        # JSON 파싱 검증
        try:
            parsed = json.loads(response_text)
            valid_json += 1
            pred_pcode = parsed.get("part_code", "")
            pred_kw = parsed.get("keyword", "")

            is_match = (pred_pcode == expected_pcode)
            if is_match:
                correct_pcode += 1

            mark = "[O] 일치" if is_match else "[X] 불일치"
            print(f"[{idx:02d}] {mark} | {elapsed_ms:3d}ms | 입력: {user_content[:26]}...")
            print(f"     정답: [{expected_pcode}] | 예측: [{pred_pcode}] (키워드: {pred_kw})")
        except Exception as e:
            print(f"[{idx:02d}] [파싱실패] | {elapsed_ms:3d}ms | 응답: {response_text[:35]} | 에러: {e}")

    avg_lat = sum(latencies) / len(latencies) if latencies else 0
    acc = (correct_pcode / len(test_samples)) * 100 if test_samples else 0
    json_rate = (valid_json / len(test_samples)) * 100 if test_samples else 0

    print("\n" + "=" * 55)
    print("=== [최종 평가 결과 리포트: 파인튜닝된 Space-SLM-0.5B] ===")
    print(f"- 테스트 건수: {len(test_samples)}건")
    print(f"- 평균 응답 시간: {avg_lat:.1f} ms")
    print(f"- 최소 / 최대 시간: {min(latencies)} ms / {max(latencies)} ms")
    print(f"- 18대 부품코드 정확도: {correct_pcode}/{len(test_samples)} ({acc:.1f}%)")
    print(f"- JSON 문법 무결성: {valid_json}/{len(test_samples)} ({json_rate:.1f}%)")
    print("=" * 55)

if __name__ == "__main__":
    run_local_evaluation(sample_count=30)
