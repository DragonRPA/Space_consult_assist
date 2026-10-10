import os
import re

SRC_DIR = r"d:\01.AntiGravity\Space_consult_assist\frontend\apps\desktop\src"

def scan():
    violations = []
    # Matches: fontSize: 10, fontSize: '10px', fontSize: '10pt', font-size: 10px, font-size: 10pt
    pattern = re.compile(r'(?:fontSize:\s*[\'"]?(\d+(?:\.\d+)?)(px|pt)?[\'"]?|font-size:\s*(\d+(?:\.\d+)?)(px|pt)?)')
    
    file_count = 0
    for root, dirs, files in os.walk(SRC_DIR):
        for f in files:
            if f.endswith(('.tsx', '.ts', '.css')):
                file_count += 1
                full_path = os.path.join(root, f)
                with open(full_path, 'r', encoding='utf-8') as fp:
                    lines = fp.readlines()
                for idx, line in enumerate(lines, 1):
                    for m in pattern.finditer(line):
                        val_str = m.group(1) or m.group(3)
                        unit = m.group(2) or m.group(4) or 'px'
                        val = float(val_str)
                        
                        # Convert to pt
                        if unit == 'pt':
                            pt_val = val
                        else:  # px
                            pt_val = val * (72.0 / 96.0)
                        
                        if pt_val < 9.99:  # Strictly less than 10pt (< 13.333px)
                            violations.append({
                                'file': f,
                                'path': full_path,
                                'line_num': idx,
                                'val': val,
                                'unit': unit,
                                'pt_val': pt_val,
                                'line': line.strip()
                            })
                            
    print(f"Total files scanned: {file_count}")
    print(f"Total violations (< 10pt / < 13.33px): {len(violations)}")
    
    # Group by file
    by_file = {}
    for v in violations:
        by_file.setdefault(v['file'], []).append(v)
        
    for fname, v_list in sorted(by_file.items(), key=lambda x: len(x[1]), reverse=True):
        print(f"\n--- {fname}: {len(v_list)} violations ---")
        for v in v_list[:10]:
            print(f"  L{v['line_num']}: {v['val']}{v['unit']} ({v['pt_val']:.2f}pt) -> {v['line'][:90]}")
        if len(v_list) > 10:
            print(f"  ... and {len(v_list) - 10} more")

if __name__ == "__main__":
    scan()
