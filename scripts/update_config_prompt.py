import json
import os

PROMPT_FILE = r"d:\01.AntiGravity\Space_consult_assist\docs\final_standard_prompt.md"
CONFIG_FILE = r"d:\01.AntiGravity\Space_consult_assist\tools\ConsultParser\core\config.json"
CONFIG_MGR_FILE = r"d:\01.AntiGravity\Space_consult_assist\tools\ConsultParser\core\config_manager.py"

# final_standard_prompt.md에서 프롬프트 본문 추출
with open(PROMPT_FILE, "r", encoding="utf-8") as f:
    text = f.read()

# ```text 사이의 프롬프트 추출
start_marker = "```text\n"
end_marker = "\n```"
start_idx = text.find(start_marker) + len(start_marker)
end_idx = text.find(end_marker, start_idx)
new_prompt = text[start_idx:end_idx].strip()

# 1. config.json 갱신
if os.path.exists(CONFIG_FILE):
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        cfg = json.load(f)
    cfg["prompt"] = new_prompt
    cfg["stage3_prompt"] = new_prompt
    cfg["model"] = "gemma3:12b"
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)
    print("[SUCCESS] config.json updated with final standard prompt!")

# 2. config_manager.py 갱신
if os.path.exists(CONFIG_MGR_FILE):
    with open(CONFIG_MGR_FILE, "r", encoding="utf-8") as f:
        lines = f.readlines()
    
    # DEFAULT_PROMPT = """...""" 구간 교체
    new_code = []
    in_prompt = False
    for line in lines:
        if line.startswith("DEFAULT_PROMPT = "):
            in_prompt = True
            new_code.append('DEFAULT_PROMPT = """' + new_prompt + '"""\n')
            continue
        if in_prompt:
            if '"""' in line:
                in_prompt = False
            continue
        new_code.append(line)
        
    with open(CONFIG_MGR_FILE, "w", encoding="utf-8") as f:
        f.writelines(new_code)
    print("[SUCCESS] config_manager.py updated with final standard prompt!")
