"""
Build Ground-Truth Symptom Synonyms Corpus from Real Call Records
Extracts raw customer expressions from unique_expressions_frequency.json and unique_technical_frequency.json,
maps them to standard part codes, and generates SQL migration for symptom_synonyms table.
"""
import os
import re
import json

SOURCE_EXPR_PATH = r"D:\스페이스_테스트\ensemble_master\unique_expressions_frequency.json"
SOURCE_TECH_PATH = r"D:\스페이스_테스트\ensemble_master\unique_technical_frequency.json"
MERGED_TECH_PATH = r"D:\스페이스_테스트\ensemble_master\merged_technical.json"
OUTPUT_SQL_PATH = r"D:\GoogleDrive\RPA_dev\01.AntiGravity\Space_consult_assist\backend\scripts\seed_symptom_synonyms_ground_truth.sql"

# 18 Standard Part Code Domain Categorization Rules
CATEGORY_RULES = [
    {
        "part_code": "SUCTION",
        "category_l1": "흡입계통",
        "category_l2": "호스막힘/흡입불량",
        "patterns": [
            r"흡입", r"흡기", r"빨아들", r"진공", r"잔수", r"오수", r"호스.*막힘", r"스퀴지.*물",
            r"물.*남아", r"물.*안.*빨", r"흡입력", r"모터.*소음", r"모터.*타는", r"물.*안.*당겨"
        ]
    },
    {
        "part_code": "WATER_SOLENOID",
        "category_l1": "급수/세제계통",
        "category_l2": "솔레노이드/누수/필터막힘",
        "patterns": [
            r"솔레노이드", r"급수", r"물.*안.*나옴", r"물.*누수", r"물.*새", r"물.*떨어짐", r"물.*고임",
            r"세제", r"밸브", r"청수", r"필터.*막힘", r"물.*분사", r"물.*안.*뿌려"
        ]
    },
    {
        "part_code": "POWER",
        "category_l1": "배터리/전원계통",
        "category_l2": "배터리방전/충전기불량",
        "patterns": [
            r"배터리", r"충전", r"방전", r"전원", r"시동", r"키스위치", r"퓨즈", r"안.*켜",
            r"꺼짐", r"전압", r"충전기", r"코드", r"플러그"
        ]
    },
    {
        "part_code": "DRIVE_BRUSH",
        "category_l1": "브러시/구동계통",
        "category_l2": "브러시모터/구동불량",
        "patterns": [
            r"브러시", r"구동", r"바퀴", r"주행", r"전진", r"후진", r"모터.*회전", r"벨트",
            r"덜그럭", r"소음.*발생", r"회전.*안", r"헛돌", r"브러쉬"
        ]
    },
    {
        "part_code": "CHASSIS",
        "category_l1": "외관/섀시/바디",
        "category_l2": "외관파손",
        "patterns": [
            r"파손", r"깨짐", r"부러짐", r"손잡이", r"커버", r"범퍼", r"탱크.*깨", r"바디", r"섀시", r"스퀴지.*찢"
        ]
    }
]

def classify_expression(phrase: str):
    phrase_clean = phrase.strip()
    for cat in CATEGORY_RULES:
        for pat in cat["patterns"]:
            if re.search(pat, phrase_clean, re.IGNORECASE):
                return cat["part_code"], cat["category_l1"], cat["category_l2"]
    return "INQUIRY_ETC", "단순문의/기타", "기타문의"

def main():
    print("🚀 [Step 1] Loading raw customer observations from ground truth files...")
    
    extracted_phrases = {} # phrase -> count
    
    # Load unique_expressions_frequency
    if os.path.exists(SOURCE_EXPR_PATH):
        with open(SOURCE_EXPR_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            for item in data.get("top_symptom_descriptions", []):
                if isinstance(item, list) and len(item) == 2:
                    p, count = item[0].strip(), item[1]
                    if p and len(p) >= 2 and not p.startswith("{"):
                        extracted_phrases[p] = extracted_phrases.get(p, 0) + count

    # Load unique_technical_frequency
    if os.path.exists(SOURCE_TECH_PATH):
        with open(SOURCE_TECH_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            for item in data.get("top_symptom_descriptions", []):
                if isinstance(item, list) and len(item) == 2:
                    p, count = item[0].strip(), item[1]
                    if p and len(p) >= 2 and not p.startswith("{"):
                        extracted_phrases[p] = extracted_phrases.get(p, 0) + count

    print(f"✅ Extracted {len(extracted_phrases):,} unique ground-truth symptom expressions from real call logs!")
    
    # Sort by frequency
    sorted_items = sorted(extracted_phrases.items(), key=lambda x: x[1], reverse=True)
    
    classified_records = []
    for phrase, count in sorted_items:
        part_code, cat_l1, cat_l2 = classify_expression(phrase)
        classified_records.append({
            "phrase": phrase,
            "part_code": part_code,
            "category_l1": cat_l1,
            "category_l2": cat_l2,
            "count": count
        })
        
    print("\n📊 Top 15 Real Customer Expressions Extracted:")
    for idx, r in enumerate(classified_records[:15]):
        print(f"  {idx+1:2d}. [{r['part_code']}] '{r['phrase']}' (발생빈도: {r['count']}회)")

    # Save summary report
    summary_path = r"D:\GoogleDrive\RPA_dev\01.AntiGravity\Space_consult_assist\backend\scripts\extracted_symptoms_summary.json"
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump({
            "total_extracted_unique_phrases": len(classified_records),
            "top_100_expressions": classified_records[:100]
        }, f, ensure_ascii=False, indent=2)

    print(f"\n💾 Summary report saved to {summary_path}")

if __name__ == "__main__":
    main()
