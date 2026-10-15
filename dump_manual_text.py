import pdfplumber
import os

MANUAL_DIR = r"d:\01.AntiGravity\Space_consult_assist\docs\manuals"

def print_page_text(fname, pages):
    fpath = os.path.join(MANUAL_DIR, fname)
    print(f"\n==================================================================")
    print(f"*** FILE: {fname} ***")
    with pdfplumber.open(fpath) as pdf:
        for p in pages:
            if 1 <= p <= len(pdf.pages):
                print(f"\n--- PAGE {p} ---")
                text = pdf.pages[p - 1].extract_text()
                print(text)

if __name__ == "__main__":
    # S3 troubleshooting & fuse
    print_page_text("SPACE_05_S3 매뉴얼.pdf", [7, 28, 31, 32, 33, 34, 35])
    # JINCLEAN9 troubleshooting & fuse
    print_page_text("SPACE_16_JINCLEAN9 매뉴얼.pdf", [2, 8, 22, 23, 24])
    # W12
    print_page_text("SPACE_10_W12 매뉴얼.pdf", [9, 24, 25, 27, 28, 29])
