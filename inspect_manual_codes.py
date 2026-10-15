# -*- coding: utf-8 -*-
import pdfplumber
import sys

# Windows 콘솔 utf-8 출력 설정
sys.stdout.reconfigure(encoding='utf-8')

def find_troubleshoot_content(pdf_path, name):
    print(f"\n==========================================")
    print(f"MODEL: {name} ({pdf_path})")
    print(f"==========================================")
    with pdfplumber.open(pdf_path) as pdf:
        found_any = False
        for idx, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            # 에러코드 및 알람 테이블 검색
            keywords = ["알람", "경보", "에러", "오류", "고장", "디스플레이", "코드", "0-C", "888", "Curtis"]
            if any(k in text for k in keywords):
                lines = [l.strip() for l in text.split("\n") if l.strip()]
                # 코드 형태나 표 형태의 줄 필터링
                code_lines = [l for l in lines if any(c in l for c in ["0-", "1-", "2-", "3-", "4-", "6-", "7-", "9-", "888", "E0", "Err", "알람", "경보", "원인", "해결"])]
                if code_lines:
                    found_any = True
                    print(f"\n--- [Page {idx+1}] ---")
                    for cl in code_lines[:15]:
                        print(f"  {cl}")
        if not found_any:
            print("  (특정 에러코드 테이블 미발견 - 일반 고장진단 문구만 존재)")

if __name__ == "__main__":
    find_troubleshoot_content("docs/manuals/SPACE_05_S3 매뉴얼.pdf", "S3 (보행식)")
    find_troubleshoot_content("docs/manuals/SPACE_06_S5 매뉴얼.pdf", "S5 (보행식 중형)")
    find_troubleshoot_content("docs/manuals/SPACE_07_S7P 매뉴얼.pdf", "S7P (탑승식 소형)")
    find_troubleshoot_content("docs/manuals/SPACE_09_S12 매뉴얼.pdf", "S12 (탑승식 대형)")
    find_troubleshoot_content("docs/manuals/SPACE_10_W12 매뉴얼.pdf", "W12 (스위퍼)")
    find_troubleshoot_content("docs/manuals/SPACE_13_JINCLEAN6 매뉴얼.pdf", "JINCLEAN 6 (J600T)")
    find_troubleshoot_content("docs/manuals/SPACE_15_JINCLEAN8 매뉴얼.pdf", "JINCLEAN 8 (J800)")
