import pdfplumber
import os

MANUAL_DIR = r"d:\01.AntiGravity\Space_consult_assist\docs\manuals"
OUT_FILE = r"d:\01.AntiGravity\Space_consult_assist\specs_dump.txt"

def dump_specs():
    targets = [
        "SPACE_03_S2 매뉴얼.pdf",
        "SPACE_04_S3mini 매뉴얼.pdf",
        "SPACE_05_S3 매뉴얼.pdf",
        "SPACE_06_S5 매뉴얼.pdf",
        "SPACE_07_S7P 매뉴얼.pdf",
        "SPACE_08_The New S7P 매뉴얼.pdf",
        "SPACE_09_S12 매뉴얼.pdf",
        "SPACE_10_W12 매뉴얼.pdf",
        "SPACE_11_W15 매뉴얼.pdf",
        "SPACE_13_JINCLEAN6 매뉴얼.pdf",
        "SPACE_14_JINCLEAN7 매뉴얼.pdf",
        "SPACE_15_JINCLEAN8 매뉴얼.pdf",
        "SPACE_16_JINCLEAN9 매뉴얼.pdf",
        "SPACE_18_JINCLEAN19 매뉴얼.pdf"
    ]

    with open(OUT_FILE, "w", encoding="utf-8") as out:
        for fname in targets:
            fpath = os.path.join(MANUAL_DIR, fname)
            if not os.path.exists(fpath):
                continue
            with pdfplumber.open(fpath) as pdf:
                for pno in [2, 3, 4]:
                    if pno <= len(pdf.pages):
                        text = pdf.pages[pno - 1].extract_text() or ""
                        if any(k in text for k in ["사양", "제원", "용량", "스펙"]):
                            out.write(f"\n==================================================\n")
                            out.write(f"{fname} - Page {pno}\n")
                            tables = pdf.pages[pno - 1].extract_tables()
                            if tables:
                                for t in tables:
                                    for r in t:
                                        out.write(" | ".join([str(c).replace('\n', ' ') if c else '' for c in r]) + "\n")
                            else:
                                out.write(text + "\n")

    print(f"Dumped specs to {OUT_FILE}")

if __name__ == "__main__":
    dump_specs()
