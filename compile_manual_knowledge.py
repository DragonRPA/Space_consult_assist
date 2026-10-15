import re
import os

INPUT_FILE = r"d:\01.AntiGravity\Space_consult_assist\extracted_manual_data.txt"
OUTPUT_REPORT = r"d:\01.AntiGravity\Space_consult_assist\docs\manual_extracted_consultation_knowledge.md"

def compile_comprehensive_analysis():
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        content = f.read()

    files = re.split(r'#{40,}\nFILE:\s*', content)
    
    report_sections = []
    report_sections.append("# 제조사 매뉴얼 기반 고부가가치 상담 지식 데이터 분석 보고서\n")
    report_sections.append("> **검토 목적**: 25종의 스페이스 공식 매뉴얼/카탈로그 원문에서 현행 16대 표준 장애 유형 및 12대 에러 코드 외에, **전화 상담사가 즉시 활용할 수 있는 추가 핵심 상담 정보**를 심층 발굴하여 시스템화 방안을 도출함.\n")

    # Categories to extract
    extracted_knowledge = {
        "1. 퓨즈 / 과부하 서킷 브레이커(Circuit Breaker) 위치 및 리셋": [],
        "2. 전자 파킹 브레이크 수동 해제 레버 (배터리 방전 시 비상 견인/이동)": [],
        "3. 스퀴지 블레이드 4면 활용 및 미세 각도(피치/높이) 조절 가이드": [],
        "4. 세제 / 소포제(Anti-Foam) 투입 규칙 및 흡입 모터 침수 방지": [],
        "5. 배터리 유형별(무보수 AGM vs 액식 Lead-Acid) 관리 및 충전기 진단": [],
        "6. 모델별 표준 소모품 규격표 (패드/스퀴지/탱크용량/가동시간)": [],
        "7. 일일 작업 종료 후 필수 5대 세척/보관 절차 (예방 점검)": []
    }

    for f_block in files[1:]:
        header_line = f_block.split("\n")[0].strip()
        fname = header_line

        pages = re.split(r'---\s*\[PAGE\s*(\d+)\]\s*---', f_block)
        for i in range(1, len(pages), 2):
            pno = pages[i]
            ptext = pages[i+1]

            # 1. 퓨즈/차단기
            if any(k in ptext for k in ["차단기", "퓨즈", "서킷브레이커", "breaker", "fuse", "리셋 버튼"]):
                extracted_knowledge["1. 퓨즈 / 과부하 서킷 브레이커(Circuit Breaker) 위치 및 리셋"].append((fname, pno, ptext))

            # 2. 브레이크/수동 이동
            if any(k in ptext for k in ["브레이크", "수동 이동", "견인", "해제 레버", "전자기 브레이크", "brake"]):
                extracted_knowledge["2. 전자 파킹 브레이크 수동 해제 레버 (배터리 방전 시 비상 견인/이동)"].append((fname, pno, ptext))

            # 3. 스퀴지
            if any(k in ptext for k in ["스퀴지", "블레이드", "4면", "뒤집", "피치", "노브", "줄무늬"]):
                extracted_knowledge["3. 스퀴지 블레이드 4면 활용 및 미세 각도(피치/높이) 조절 가이드"].append((fname, pno, ptext))

            # 4. 소포제/세제
            if any(k in ptext for k in ["소포제", "거품", "세제", "중성세제", "모터 침수", "플로트"]):
                extracted_knowledge["4. 세제 / 소포제(Anti-Foam) 투입 규칙 및 흡입 모터 침수 방지"].append((fname, pno, ptext))

            # 5. 배터리/충전기
            if any(k in ptext for k in ["증류수", "충전기", "전해액", "완충", "충전 시간", "트리클"]):
                extracted_knowledge["5. 배터리 유형별(무보수 AGM vs 액식 Lead-Acid) 관리 및 충전기 진단"].append((fname, pno, ptext))

            # 6. 소모품 규격
            if any(k in ptext for k in ["스펙", "사양", "제원", "탱크 용량", "청수", "오수", "브러시 모터", "흡입 모터"]) and ("모터" in ptext or "용량" in ptext):
                extracted_knowledge["6. 모델별 표준 소모품 규격표 (패드/스퀴지/탱크용량/가동시간)"].append((fname, pno, ptext))

            # 7. 일일 점검/보관
            if any(k in ptext for k in ["일일 점검", "보관", "동파", "세척", "사용 후"]):
                extracted_knowledge["7. 일일 작업 종료 후 필수 5대 세척/보관 절차 (예방 점검)"].append((fname, pno, ptext))

    for cat_title, items in extracted_knowledge.items():
        report_sections.append(f"\n## {cat_title}\n")
        report_sections.append(f"- **총 발견 매뉴얼/페이지 수**: {len(items)} 건\n")
        
        # Deduplicate by file
        seen_files = {}
        for fname, pno, ptext in items:
            if fname not in seen_files:
                seen_files[fname] = []
            seen_files[fname].append((pno, ptext))

        for fname, pages_data in list(seen_files.items())[:5]:
            report_sections.append(f"### 📄 [{fname}] (관련 페이지: {', '.join([p[0] for p in pages_data])}p)")
            for pno, ptext in pages_data[:2]:
                lines = [l.strip() for l in ptext.split("\n") if l.strip()]
                report_sections.append(f"> **Page {pno} 핵심 발췌:**")
                report_sections.append("```text")
                report_sections.append("\n".join(lines[:15]))
                report_sections.append("```\n")

    os.makedirs(os.path.dirname(OUTPUT_REPORT), exist_ok=True)
    with open(OUTPUT_REPORT, "w", encoding="utf-8") as out:
        out.write("\n".join(report_sections))

    print(f"Report successfully compiled at: {OUTPUT_REPORT}")

if __name__ == "__main__":
    compile_comprehensive_analysis()
