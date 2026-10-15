import pdfplumber
import os

MANUAL_DIR = r"d:\01.AntiGravity\Space_consult_assist\docs\manuals"
OUT_FILE = r"d:\01.AntiGravity\Space_consult_assist\detailed_sections_dump.txt"

def dump_key_sections():
    targets = [
        ("SPACE_05_S3 매뉴얼.pdf", [2, 12, 13, 15, 16, 17, 20, 23, 25, 26, 27, 28]),
        ("SPACE_07_S7P 매뉴얼.pdf", [2, 13, 14, 15, 16, 17, 18, 19, 23, 24, 25, 27]),
        ("SPACE_10_W12 매뉴얼.pdf", [2, 12, 13, 14, 21, 22, 23, 24, 25]),
        ("SPACE_16_JINCLEAN9 매뉴얼.pdf", [2, 7, 8, 9, 13, 14, 15, 22, 23, 24])
    ]

    with open(OUT_FILE, "w", encoding="utf-8") as out:
        for fname, pages in targets:
            out.write(f"\n======================================================\n")
            out.write(f"FILE: {fname}\n")
            out.write(f"======================================================\n")
            fpath = os.path.join(MANUAL_DIR, fname)
            with pdfplumber.open(fpath) as pdf:
                for p in pages:
                    if 1 <= p <= len(pdf.pages):
                        out.write(f"\n--- PAGE {p} ---\n")
                        text = pdf.pages[p - 1].extract_text() or ""
                        out.write(text + "\n")

    print(f"Dump complete: {OUT_FILE}")

if __name__ == "__main__":
    dump_key_sections()
