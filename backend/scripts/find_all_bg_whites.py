import glob
import os
import re

SRC_DIR = r"frontend/apps/desktop/src"

files = glob.glob(os.path.join(SRC_DIR, "**/*.*"), recursive=True)
files = [f for f in files if f.endswith(('.tsx', '.ts', '.css'))]

for fpath in files:
    with open(fpath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Check for #fff, #ffffff, white used in backgrounds, borders, or variables
    # Let's find every occurrence of #ffffff or #fff
    matches = re.finditer(r'(?:background(?:Color)?\s*:\s*|style\.background(?:Color)?\s*=\s*)([^\n;},]+)', content)
    for m in matches:
        expr = m.group(1).strip()
        if '#fff' in expr.lower() or 'white' in expr.lower():
            # Check if it's text color or actual white background
            if not re.search(r'color\s*:\s*[\'"]#(?:ffffff|fff)\b', expr, re.I):
                print(f"[{os.path.basename(fpath)}] {expr}")

