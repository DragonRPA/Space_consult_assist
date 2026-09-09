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

MODEL_PATH = r"d:\01.AntiGravity\Space_consult_assist\scripts\merged_qwen_0.5b_v2"
TEXT_DIR = r"D:\스페이스_테스트\stt_texts"
MASTER_DIR = r"D:\스페이스_테스트\ensemble_master"

print("==================================================================")
print("  🎯 [트랙 2 실증] Qwen2.5-0.5B v2 균형 재학습 모델 50건 정량 벤치마크")
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
vram_gb = torch.cuda.memory_allocated() / (1024**3)
print(f"✅ 모델 로드 완료 ({time.time() - t0:.2f}초) | GPU VRAM: {vram_gb:.2f} GB\n")

# 2. ensemble_master에서 아까와 동일한 50건 로드
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

print(f"📊 테스트 대상: 총 {len(test_samples)}건 (기술 20, 영업 15, 일정 15)\n")

# 3. 추론 실행
system_prompt = """너는 바닥 청소장비 고객 상담 전문 분석기다. 통화 녹취록을 면밀히 분석하여 4대 표준 규칙에 따라 오직 순수 JSON 형식으로만 응답하라.

[통화유형 분류 기준]
- "기술문의": 장비 고장, 이상 증상, A/S 요청, 수리, 부품 교체/누수
- "영업문의": 장비 구매, 임대/렌탈 단가, 견적서, 카탈로그, 사양 문의
- "일정조율": 장비 납품/배송 일정, 회수 일정, 기사 방문 시간 조율
- "기타": 단순 연락처, 부서 안내, 개인 잡담, 잘못 걸려온 전화

[응답 JSON 스키마]
{"통화유형": "기술문의", "증상목록": [{"계통분류": "계통명", "핵심어구": "고객발화어구", "세부증상": "요약"}], "조치목록": [{"조치유형": "유형명", "조치내용": "내용", "처리결과": "결과"}], "한줄요약": "요약문"}"""

results = []
latencies = []

print("⚡ 추론 및 1:1 정밀 채점 시작...")
for idx, s in enumerate(test_samples, 1):
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": s["content"][:800]}
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
    dur_ms = (time.time() - t_start) * 1000
    latencies.append(dur_ms)
    
    generated_ids = outputs[0][inputs.input_ids.shape[1]:]
    resp = tokenizer.decode(generated_ids, skip_special_tokens=True).strip()
    
    # JSON 파싱 및 통화유형 추출
    predicted_type = "파싱실패"
    try:
        j_str = resp
        if "{" in resp and "}" in resp:
            j_str = resp[resp.find("{"):resp.rfind("}")+1]
        data = json.loads(j_str)
        predicted_type = data.get("통화유형", "")
        if not predicted_type:
            # call_type 별칭 지원
            predicted_type = data.get("call_type", "")
    except Exception:
        # 텍스트 폴백
        for candidate in ["기술문의", "영업문의", "일정조율", "기타"]:
            if candidate in resp[:50]:
                predicted_type = candidate
                break
                
    is_correct = (predicted_type == s["ground_truth_type"])
    
    results.append({
        "file": s["file_name"],
        "ground_truth": s["ground_truth_type"],
        "predicted_type": predicted_type,
        "is_correct": is_correct,
        "latency_ms": dur_ms,
        "raw_response": resp
    })
    
    status_icon = "🟢" if is_correct else "🔴"
    if idx % 5 == 0 or idx == len(test_samples):
        print(f"[{idx:02d}/50] {status_icon} 정답: {s['ground_truth_type']:<5} | 예측: {predicted_type:<5} | {dur_ms:.0f}ms")

# 4. 종합 집계
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

print("\n==================================================================")
print("  🎯 [2차 벤치마크 최종 결과: Qwen-0.5B v2 균형 모델]")
print("==================================================================")
print(f"총 테스트 건수: {total_count}건")
print(f"종합 정확도(Accuracy): {total_acc:.1f}% ({correct_count}/{total_count}) (1차 모델: 42.0%)")
print(f"평균 응답 속도: {avg_latency:.1f}ms (초당 {1000/avg_latency:.1f}건)")
print(f"GPU VRAM 점유: {vram_gb:.2f} GB")
print("------------------------------------------------------------------")
print("[유형별 정확도]")
for k, v in by_type.items():
    acc = (v["correct"] / v["total"]) * 100
    print(f"- {k:<5} (총 {v['total']}건): 정확도 {acc:5.1f}% ({v['correct']}/{v['total']}) | 예측분포: {v['preds']}")
print("==================================================================")
