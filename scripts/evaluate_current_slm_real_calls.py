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

MODEL_PATH = r"d:\01.AntiGravity\Space_consult_assist\scripts\merged_qwen_0.5b"
TEXT_DIR = r"D:\스페이스_테스트\stt_texts"
MASTER_DIR = r"D:\스페이스_테스트\ensemble_master"

print("==================================================================")
print("  🚀 [선택 A] 현재 훈련된 0.5B 모델 실데이터 50건 정량 벤치마크")
print("==================================================================")

# 1. 모델 로드
print("📦 모델 로딩 중...")
t0 = time.time()
tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
model = AutoModelForCausalLM.from_pretrained(
    MODEL_PATH,
    dtype=torch.bfloat16,
    device_map="cuda"
)
vram_gb = torch.cuda.memory_allocated() / (1024**3)
print(f"✅ 모델 로드 완료 ({time.time() - t0:.2f}초) | GPU VRAM: {vram_gb:.2f} GB\n")

# 2. ensemble_master에서 정답 라벨이 있는 샘플 50건 선정
# 기술 20건, 영업 15건, 일정 15건
def load_json_records(fname):
    p = os.path.join(MASTER_DIR, fname)
    if os.path.exists(p):
        with open(p, "r", encoding="utf-8") as fp:
            return json.load(fp)
    return []

tech_records = load_json_records("merged_technical.json")
sales_records = load_json_records("merged_sales.json")
sched_records = load_json_records("merged_schedule.json")

test_samples = []

def collect_valid_samples(records, target_type, limit):
    collected = 0
    for r in records:
        txt_name = r.get("source_txt_file", "")
        if not txt_name:
            txt_name = r.get("file_name", "") + ".txt"
        txt_path = os.path.join(TEXT_DIR, txt_name)
        if os.path.exists(txt_path):
            try:
                with open(txt_path, "r", encoding="utf-8") as fp:
                    content = fp.read().strip()
                if 100 <= len(content) <= 1500:
                    test_samples.append({
                        "file_name": txt_name,
                        "ground_truth_type": target_type,
                        "content": content
                    })
                    collected += 1
                    if collected >= limit:
                        break
            except Exception:
                continue

collect_valid_samples(tech_records, "기술문의", 20)
collect_valid_samples(sales_records, "영업문의", 15)
collect_valid_samples(sched_records, "일정조율", 15)

print(f"📊 테스트 표본 수집 완료: 총 {len(test_samples)}건")
print(f"   - 기술문의 (정답): 20건")
print(f"   - 영업문의 (정답): 15건")
print(f"   - 일정조율 (정답): 15건\n")

# 3. 추론 및 채점
system_prompt = "너는 바닥 청소장비 A/S 상담 전문 분류기다. 고객 발화에서 핵심 증상 키워드와 18개 표준 부품코드(SALES_INQUIRY, SCHEDULE_DELIVERY, SUCTION, POWER, DRIVE_BRUSH, WATER_SOLENOID, CHASSIS, WATER_NO_FLOW, BRUSH_WIRE, BRUSH_COVER, FORWARD_FAIL, WATER_SUPPLY_FAIL, BRUSH_FAIL, CHARGER_FAIL, POWER_FAIL, CHARGE_INDICATOR, INQUIRY_ETC, IRRELEVANT) 중 하나를 매핑하여 오직 JSON 형식으로만 응답하라."

# 부품코드 ➔ 통화유형 매핑 기준
# SALES_INQUIRY -> 영업문의
# SCHEDULE_DELIVERY -> 일정조율
# INQUIRY_ETC, IRRELEVANT -> 기타/단순문의
# 나머지 부품코드(POWER, SUCTION, DRIVE_BRUSH 등) -> 기술문의

def map_code_to_type(part_code):
    c = (part_code or "").upper()
    if "SALES" in c:
        return "영업문의"
    elif "SCHEDULE" in c or "DELIVERY" in c:
        return "일정조율"
    elif "IRRELEVANT" in c:
        return "기타"
    else:
        return "기술문의"

results = []
latencies = []

print("⚡ 추론 실행 시작...")
for idx, s in enumerate(test_samples, 1):
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": s["content"]}
    ]
    prompt = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer(prompt, return_tensors="pt").to("cuda")
    
    t_start = time.time()
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=96,
            temperature=0.1,
            do_sample=False,
            pad_token_id=tokenizer.eos_token_id
        )
    dur_ms = (time.time() - t_start) * 1000
    latencies.append(dur_ms)
    
    generated_ids = outputs[0][inputs.input_ids.shape[1]:]
    resp = tokenizer.decode(generated_ids, skip_special_tokens=True).strip()
    
    # JSON 파싱
    predicted_code = ""
    predicted_type = "파싱실패"
    try:
        # JSON 블록 정규화
        j_str = resp
        if "{" in resp and "}" in resp:
            j_str = resp[resp.find("{"):resp.rfind("}")+1]
        data = json.loads(j_str)
        predicted_code = data.get("part_code", "")
        predicted_type = map_code_to_type(predicted_code)
    except Exception:
        predicted_type = "파싱실패"
        
    is_correct = (predicted_type == s["ground_truth_type"])
    
    results.append({
        "file": s["file_name"],
        "ground_truth": s["ground_truth_type"],
        "predicted_code": predicted_code,
        "predicted_type": predicted_type,
        "is_correct": is_correct,
        "latency_ms": dur_ms,
        "raw_response": resp
    })
    
    status_icon = "🟢" if is_correct else "🔴"
    if idx % 5 == 0 or idx == len(test_samples):
        print(f"[{idx:02d}/{len(test_samples)}] {status_icon} 정답: {s['ground_truth_type']:<5} | 예측: {predicted_type:<5} ({predicted_code}) | {dur_ms:.0f}ms")

# 4. 종합 지표 집계
total_count = len(results)
correct_count = sum(1 for r in results if r["is_correct"])
total_acc = (correct_count / total_count) * 100

by_type = {}
for r in results:
    gt = r["ground_truth"]
    if gt not in by_type:
        by_type[gt] = {"total": 0, "correct": 0, "preds": {}}
    by_type[gt]["total"] += 1
    if r["is_correct"]:
        by_type[gt]["correct"] += 1
    pred = r["predicted_type"]
    by_type[gt]["preds"][pred] = by_type[gt]["preds"].get(pred, 0) + 1

avg_latency = sum(latencies) / len(latencies)

summary_report = {
    "total_samples": total_count,
    "correct_samples": correct_count,
    "accuracy_percent": round(total_acc, 1),
    "avg_latency_ms": round(avg_latency, 1),
    "vram_gb": round(vram_gb, 2),
    "breakdown": by_type
}

with open(r"d:\01.AntiGravity\Space_consult_assist\scripts\slm_benchmark_results.json", "w", encoding="utf-8") as fp:
    json.dump(summary_report, fp, ensure_ascii=False, indent=2)

print("\n==================================================================")
print("  🎯 50건 정량 벤치마크 최종 결과")
print("==================================================================")
print(f"총 테스트 건수: {total_count}건")
print(f"정확도(Accuracy): {total_acc:.1f}% ({correct_count}/{total_count})")
print(f"평균 응답 속도: {avg_latency:.1f}ms (초당 {1000/avg_latency:.1f}건)")
print(f"GPU VRAM 점유: {vram_gb:.2f} GB")
print("------------------------------------------------------------------")
print("[유형별 정확도]")
for k, v in by_type.items():
    acc = (v["correct"] / v["total"]) * 100
    print(f"- {k:<5} (총 {v['total']}건): 정확도 {acc:5.1f}% ({v['correct']}/{v['total']}) | 예측분포: {v['preds']}")
print("==================================================================")
