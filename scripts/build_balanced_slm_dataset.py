import os
import sys
import json
import random

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

MASTER_DIR = r"D:\스페이스_테스트\ensemble_master"
TEXT_DIR = r"D:\스페이스_테스트\stt_texts"
OUTPUT_DIR = r"d:\01.AntiGravity\Space_consult_assist\scripts"

print("==================================================================")
print("  ⚖️ [트랙 2] 실데이터 12,000건 기반 1:1:1 균형 SLM 데이터셋 구축")
print("==================================================================")

SYSTEM_PROMPT = """너는 바닥 청소장비 고객 상담 전문 분석기다. 통화 녹취록을 면밀히 분석하여 4대 표준 규칙에 따라 오직 순수 JSON 형식으로만 응답하라.

[통화유형 분류 기준]
- "기술문의": 장비 고장, 이상 증상, A/S 요청, 수리, 부품 교체/누수
- "영업문의": 장비 구매, 임대/렌탈 단가, 견적서, 카탈로그, 사양 문의
- "일정조율": 장비 납품/배송 일정, 회수 일정, 기사 방문 시간 조율
- "기타": 단순 연락처, 부서 안내, 개인 잡담, 잘못 걸려온 전화

[응답 JSON 스키마]
{"통화유형": "기술문의", "증상목록": [{"계통분류": "계통명", "핵심어구": "고객발화어구", "세부증상": "요약"}], "조치목록": [{"조치유형": "유형명", "조치내용": "내용", "처리결과": "결과"}], "한줄요약": "요약문"}"""

def load_and_prepare(json_filename, target_type, limit):
    p = os.path.join(MASTER_DIR, json_filename)
    if not os.path.exists(p):
        return []
    with open(p, "r", encoding="utf-8") as f:
        records = json.load(f)
    
    samples = []
    for r in records:
        txt_name = r.get("source_txt_file", "")
        if not txt_name:
            txt_name = r.get("file_name", "") + ".txt"
        txt_path = os.path.join(TEXT_DIR, txt_name)
        if not os.path.exists(txt_path):
            continue
        try:
            with open(txt_path, "r", encoding="utf-8") as fp:
                content = fp.read().strip()
            if len(content) < 80 or len(content) > 1800:
                continue
        except Exception:
            continue
        
        # 정답 레이블 구성
        symptoms = r.get("증상", [])
        actions = r.get("조치", [])
        summary = r.get("summary", "")
        
        norm_symptoms = []
        for s in symptoms:
            norm_symptoms.append({
                "계통분류": s.get("분류", "미분류"),
                "핵심어구": s.get("증상", ""),
                "세부증상": s.get("증상", "")
            })
            
        norm_actions = []
        for a in actions:
            norm_actions.append({
                "조치유형": a.get("유형", "미분류"),
                "조치내용": a.get("조치내용", ""),
                "처리결과": a.get("결과", "")
            })
            
        label_obj = {
            "통화유형": target_type,
            "증상목록": norm_symptoms,
            "조치목록": norm_actions,
            "한줄요약": summary
        }
        
        assistant_json = json.dumps(label_obj, ensure_ascii=False)
        
        samples.append({
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": content},
                {"role": "assistant", "content": assistant_json}
            ]
        })
        if len(samples) >= limit:
            break
            
    print(f"  - [{target_type}] 유효 샘플 수집: {len(samples)}건")
    return samples

# 균형 수집 (각 2,500건 = 총 7,500건)
tech_samples = load_and_prepare("merged_technical.json", "기술문의", 2500)
sales_samples = load_and_prepare("merged_sales.json", "영업문의", 2500)
sched_samples = load_and_prepare("merged_schedule.json", "일정조율", 2500)

all_samples = tech_samples + sales_samples + sched_samples
random.seed(42)
random.shuffle(all_samples)

split_idx = int(len(all_samples) * 0.9)
train_set = all_samples[:split_idx]
test_set = all_samples[split_idx:]

train_path = os.path.join(OUTPUT_DIR, "dataset_balanced_train.jsonl")
test_path = os.path.join(OUTPUT_DIR, "dataset_balanced_test.jsonl")

with open(train_path, "w", encoding="utf-8") as f:
    for s in train_set:
        f.write(json.dumps(s, ensure_ascii=False) + "\n")

with open(test_path, "w", encoding="utf-8") as f:
    for s in test_set:
        f.write(json.dumps(s, ensure_ascii=False) + "\n")

print(f"\n✅ 균형 데이터셋 생성 완료! 총 {len(all_samples)}건")
print(f"  - 학습용: {len(train_set)}건 -> {train_path}")
print(f"  - 검증용: {len(test_set)}건 -> {test_path}")
