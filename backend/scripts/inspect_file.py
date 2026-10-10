import sys
import re

def inspect(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    pattern = re.compile(r'(?:fontSize:\s*[\'"]?(\d+(?:\.\d+)?)(px|pt)?[\'"]?|font-size:\s*(\d+(?:\.\d+)?)(px|pt)?)')
    for i, line in enumerate(lines, 1):
        for m in pattern.finditer(line):
            v = float(m.group(1) or m.group(3))
            u = m.group(2) or m.group(4) or 'px'
            pt = v if u == 'pt' else v * 0.75
            if pt < 9.99:
                print(f"L{i}: ({v}{u} -> {pt:.2f}pt) {line.strip()}")

if __name__ == "__main__":
    filepath = sys.argv[1]
    outpath = sys.argv[2] if len(sys.argv) > 2 else None
    
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    pattern = re.compile(r'(?:fontSize:\s*[\'"]?(\d+(?:\.\d+)?)(px|pt)?[\'"]?|font-size:\s*(\d+(?:\.\d+)?)(px|pt)?)')
    out_lines = []
    for i, line in enumerate(lines, 1):
        for m in pattern.finditer(line):
            v = float(m.group(1) or m.group(3))
            u = m.group(2) or m.group(4) or 'px'
            pt = v if u == 'pt' else v * 0.75
            if pt < 9.99:
                out_lines.append(f"L{i}: ({v}{u} -> {pt:.2f}pt) {line.strip()}\n")
                
    if outpath:
        with open(outpath, 'w', encoding='utf-8') as f:
            f.writelines(out_lines)
    else:
        for l in out_lines:
            print(l, end='')
