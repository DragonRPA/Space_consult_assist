import glob
import os
import re

SRC_DIR = r"frontend/apps/desktop/src"

files = glob.glob(os.path.join(SRC_DIR, "**/*.*"), recursive=True)
files = [f for f in files if f.endswith(('.tsx', '.ts', '.css'))]

actual_white_bgs = []

for fpath in files:
    with open(fpath, "r", encoding="utf-8") as f:
        lines = f.readlines()
    for idx, line in enumerate(lines, 1):
        clean = line.strip()
        if clean.startswith("//") or clean.startswith("/*") or clean.startswith("*"):
            continue
        
        # Look for background or backgroundColor properties assigned #ffffff, #fff, or white
        # Handles direct assignment: background: '#fff', background: '#ffffff', backgroundColor: '#fff', background: 'white'
        # Handles ternaries: background: isSomething ? '#fff' : '#...', background: isSomething ? '#...' : '#ffffff'
        # Handles hover: e.currentTarget.style.background = '#fff'
        
        # Test if #fff or #ffffff or white is part of background
        bg_match = re.search(r'background(?:Color)?\s*:\s*([^,;}>]+)', clean)
        hover_match = re.search(r'style\.background(?:Color)?\s*=\s*[\'"]([^\'"]+)[\'"]', clean)
        
        val = None
        if bg_match:
            val = bg_match.group(1)
        elif hover_match:
            val = hover_match.group(1)
            
        if val:
            # Check if val contains #ffffff, #fff, or white (as color, not whitespace or white-space)
            if re.search(r'#(?:ffffff|fff)\b|[\'"]white[\'"]', val, re.I):
                actual_white_bgs.append((os.path.basename(fpath), fpath, idx, clean, val.strip()))

print(f"Total REAL white backgrounds: {len(actual_white_bgs)}")
for fname, path, line_no, text, val in actual_white_bgs:
    print(f"[{fname}:{line_no}] Val: {val}")
    print(f"   Line: {text[:100]}")
