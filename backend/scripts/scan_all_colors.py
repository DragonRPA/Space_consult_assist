import os
import glob
import re
from collections import Counter

FRONTEND_SRC = r"frontend/apps/desktop/src"

def scan_colors():
    files = glob.glob(os.path.join(FRONTEND_SRC, "**/*.*"), recursive=True)
    ui_files = [f for f in files if f.endswith(('.tsx', '.ts', '.css'))]

    hex_pattern = re.compile(r'#([0-9a-fA-F]{3,8})\b')
    rgba_pattern = re.compile(r'rgba?\([^\)]+\)')
    
    all_hex = Counter()
    all_rgba = Counter()
    file_colors = {}

    for f in ui_files:
        with open(f, 'r', encoding='utf-8') as fp:
            content = fp.read()
            hexes = [m.group(0).lower() for m in hex_pattern.finditer(content)]
            rgbas = [m.group(0).lower() for m in rgba_pattern.finditer(content)]
            
            all_hex.update(hexes)
            all_rgba.update(rgbas)
            file_colors[f] = Counter(hexes)

    print("=== Top 30 HEX Colors ===")
    for c, count in all_hex.most_common(30):
        print(f"  {c}: {count}")

    print("\n=== Top 20 RGBA Colors ===")
    for c, count in all_rgba.most_common(20):
        print(f"  {c}: {count}")

    print("\n=== File Summary ===")
    for f, colors in file_colors.items():
        if colors:
            print(f"  {f}: {len(colors)} unique hex colors")

if __name__ == "__main__":
    scan_colors()
