import re

INPUT_FILE = r"d:\01.AntiGravity\Space_consult_assist\extracted_manual_data.txt"

def analyze_topics():
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        content = f.read()

    # Split by file
    files = re.split(r'#{40,}\nFILE:\s*', content)
    print(f"Total manual blocks: {len(files) - 1}")

    topic_matches = {
        "차단기_퓨즈": ["차단기", "퓨즈", "리셋", "과부하", "fuse", "breaker"],
        "브레이크_수동이동": ["브레이크", "수동", "견인", "해제 레버", "brake"],
        "스퀴지_조절_뒤집기": ["스퀴지", "블레이드", "4면", "뒤집", "각도", "기울기", "조절 노브"],
        "소모품_규격_사양": ["규격", "사양", "치수", "용량", "모터 출력", "배터리", "17인치", "20인치", "Ah"],
        "세제_소포제_거품": ["거품", "소포제", "세제", "모터 흡입", "중성세제"],
        "배터리_충전_증류수": ["증류수", "충전기", "충전 시간", "전해액", "완충"]
    }

    results = {topic: [] for topic in topic_matches}

    for f_block in files[1:]:
        fname_match = re.match(r'([^\n]+)', f_block)
        if not fname_match:
            continue
        fname = fname_match.group(1).strip()

        for topic, kws in topic_matches.items():
            matched_sections = []
            pages = re.split(r'---\s*\[PAGE\s*(\d+)\]\s*---', f_block)
            # pages will have alternating [text, page_num, text, page_num, ...]
            for i in range(1, len(pages), 2):
                pno = pages[i]
                ptext = pages[i+1]
                found_kws = [kw for kw in kws if kw in ptext]
                if len(found_kws) >= 2:
                    matched_sections.append({
                        "page": pno,
                        "kws": found_kws,
                        "snippet": "\n".join([line.strip() for line in ptext.split("\n") if any(k in line for k in found_kws)][:6])
                    })
            if matched_sections:
                results[topic].append({
                    "file": fname,
                    "count": len(matched_sections),
                    "sections": matched_sections[:3]
                })

    for topic, items in results.items():
        print(f"\n================================================================================")
        print(f"TOPIC: {topic} (Found in {len(items)} manuals)")
        print(f"================================================================================")
        for item in items[:4]:
            print(f"  * {item['file']}: {item['count']} pages")
            for sec in item['sections'][:2]:
                print(f"    [P.{sec['page']}] Kws: {','.join(sec['kws'])}")
                print(f"      {sec['snippet'][:120]}...")

if __name__ == "__main__":
    analyze_topics()
