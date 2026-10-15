# -*- coding: utf-8 -*-
import pdfplumber
import sys
import io
import re

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

pdf_path = "j600_manual_real.pdf"
with pdfplumber.open(pdf_path) as pdf:
    print(f"Total Pages in J600 Manual: {len(pdf.pages)}")
    full_text = []
    for i, page in enumerate(pdf.pages, 1):
        txt = page.extract_text() or ""
        full_text.append(f"--- [PAGE {i}] ---\n" + txt)

combined_text = "\n".join(full_text)

# Search for troubleshooting, error codes, controller terms
keywords = ["에러", "오류", "고장", "조치", "문제", "경고", "코드", "트러블", "원인", "디스플레이", "점검", "수리"]
matches = []
for page_num, pt in enumerate(full_text, 1):
    for kw in keywords:
        if kw in pt:
            matches.append(page_num)
            break

print(f"Pages containing trouble/error keywords: {set(matches)}")

# Save full text to inspection file
with open("j600_manual_extracted.txt", "w", encoding="utf-8") as f:
    f.write(combined_text)

print("Saved extracted text to j600_manual_extracted.txt")
