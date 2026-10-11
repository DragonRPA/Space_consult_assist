import os
import glob
import re

FRONTEND_SRC = r"frontend/apps/desktop/src"

def check_files():
    files = glob.glob(os.path.join(FRONTEND_SRC, "**/*.*"), recursive=True)
    ui_files = [f for f in files if f.endswith(('.tsx', '.ts', '.css', '.html'))]

    print(f"Scanning {len(ui_files)} frontend files...")
    
    findings = []
    for f in ui_files:
        with open(f, 'r', encoding='utf-8') as fp:
            lines = fp.readlines()
            for idx, line in enumerate(lines):
                lineno = idx + 1
                # 1. Check side border >= 2px
                if re.search(r'border(Left|Right)\s*:\s*[\'\"`][2-9]px', line) or re.search(r'border-(left|right)\s*:\s*[2-9]px', line):
                    findings.append((f, lineno, "side-tab / thick side border", line.strip()))
                # 2. Check bounce
                if 'animate-bounce' in line or 'bounce' in line and 'cubic-bezier' in line:
                    findings.append((f, lineno, "bounce animation", line.strip()))
                # 3. Check font size < 13px
                font_match = re.search(r'fontSize:\s*([0-9\.]+)', line)
                if font_match:
                    val = float(font_match.group(1))
                    if val < 13.33:
                        findings.append((f, lineno, f"font < 10pt ({val}px)", line.strip()))
                # 4. Check CSS font-size: Xpx
                css_font = re.search(r'font-size:\s*([0-9\.]+)px', line)
                if css_font:
                    val = float(css_font.group(1))
                    if val < 13.33:
                        findings.append((f, lineno, f"CSS font < 10pt ({val}px)", line.strip()))

    print(f"Found {len(findings)} items:")
    for file, lineno, issue, snippet in findings:
        print(f"  {file}:{lineno} [{issue}] -> {snippet[:80]}")

if __name__ == "__main__":
    check_files()
