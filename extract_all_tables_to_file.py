import os
import glob
import pdfplumber
import sys

MANUAL_DIR = r"d:\01.AntiGravity\Space_consult_assist\docs\manuals"
OUTPUT_FILE = r"d:\01.AntiGravity\Space_consult_assist\extracted_manual_data.txt"

def extract_manual_details():
    pdf_files = sorted(glob.glob(os.path.join(MANUAL_DIR, "*.pdf")))
    
    with open(OUTPUT_FILE, "w", encoding="utf-8") as out:
        out.write("================================================================================\n")
        out.write("SPACE 청소장비 전 기종 매뉴얼 정밀 추출 데이터 (고장진단, 퓨즈/차단기, 제원, 일일점검)\n")
        out.write("================================================================================\n\n")

        for pdf_path in pdf_files:
            fname = os.path.basename(pdf_path)
            out.write(f"\n################################################################################\n")
            out.write(f"FILE: {fname}\n")
            out.write(f"################################################################################\n")

            try:
                with pdfplumber.open(pdf_path) as pdf:
                    for pno, page in enumerate(pdf.pages, 1):
                        text = page.extract_text() or ""
                        
                        # Keywords to capture high value consultation pages
                        interest_keywords = [
                            "문제 해결", "고장 진단", "고장시", "원인 및 대책", "이상 현상", "조치 사항",
                            "퓨즈", "차단기", "리셋", "브레이크", "견인", "수동", "사양", "제원",
                            "일일 점검", "정기 점검", "스퀴지 조절", "브러시 교체", "배터리 충전", "세제"
                        ]
                        
                        if any(kw in text for kw in interest_keywords):
                            out.write(f"\n--- [PAGE {pno}] ---\n")
                            # Extract tables if any
                            tables = page.extract_tables()
                            if tables:
                                out.write(">>> [TABLE DATA DETECTED] <<<\n")
                                for t_idx, tbl in enumerate(tables):
                                    out.write(f"--- Table {t_idx+1} ---\n")
                                    for row in tbl:
                                        row_clean = [str(c).replace('\n', ' ') if c is not None else '' for c in row]
                                        out.write(" | ".join(row_clean) + "\n")
                            out.write(">>> [RAW TEXT] <<<\n")
                            out.write(text + "\n")
            except Exception as e:
                out.write(f"ERROR reading {fname}: {e}\n")

    print(f"Extraction complete! Results saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    extract_manual_details()
