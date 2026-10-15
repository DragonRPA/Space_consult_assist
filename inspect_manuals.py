import os
import glob
import pdfplumber

MANUAL_DIR = r"d:\01.AntiGravity\Space_consult_assist\docs\manuals"

def inspect_all_manuals():
    pdf_files = sorted(glob.glob(os.path.join(MANUAL_DIR, "*.pdf")))
    print(f"Total PDFs found: {len(pdf_files)}")

    for pdf_path in pdf_files:
        filename = os.path.basename(pdf_path)
        try:
            with pdfplumber.open(pdf_path) as pdf:
                num_pages = len(pdf.pages)
                print(f"\n==================================================")
                print(f"File: {filename} (Pages: {num_pages})")
                
                # Check each page for key headings
                keywords = ["문제", "고장", "해결", "점검", "사양", "제원", "규격", "퓨즈", "차단기", "배터리", "충전", "스퀴지", "브러시", "소모품", "필터", "밸브", "에러", "경고", "조작", "스위치", "주의", "유지보수", "trouble", "spec", "fuse"]
                
                page_summaries = []
                for idx, page in enumerate(pdf.pages):
                    text = page.extract_text() or ""
                    # find matching keywords
                    found = [kw for kw in keywords if kw in text.lower()]
                    first_line = text.split("\n")[0] if text else "(No text)"
                    if found:
                        page_summaries.append((idx + 1, found[:6], first_line[:50]))

                print(f"Pages with key operational/troubleshooting keywords: {len(page_summaries)}")
                for pno, kws, fline in page_summaries[:15]:
                    print(f"  Page {pno:2d} | Kws: {','.join(kws)} | Title: {fline}")
        except Exception as e:
            print(f"Error reading {filename}: {e}")

if __name__ == "__main__":
    inspect_all_manuals()
