import os
import re

path = r'C:\Users\이정용\.gemini\antigravity\brain\d6b9a579-81fe-46cd-96d5-753dc6f1290d\scratch\init_project.ps1'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

root = r'D:\GoogleDrive\RPA_dev\01.AntiGravity\Space_consult_assist'
content = []

for line in lines:
    if line.strip() == "@'":
        content = []
    elif line.strip().startswith("'@ | Set-Content"):
        match = re.search(r'\$root\\([^"]+)', line)
        if match:
            filename = match.group(1).replace("\"", "")
            out_path = os.path.join(root, filename)
            with open(out_path, 'w', encoding='utf-8') as out:
                out.write("".join(content))
            print(f"Recreated {filename}")
    else:
        content.append(line)
