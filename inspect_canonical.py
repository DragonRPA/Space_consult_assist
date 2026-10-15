import os

CANONICAL_PATH = r"d:\01.AntiGravity\Space_consult_assist\backend\app\api\v1\endpoints\canonical_symptoms.py"

with open(CANONICAL_PATH, "r", encoding="utf-8") as f:
    code = f.read()

# Let's inspect where CANONICAL_FAILURE_TYPES begins
print("File length:", len(code))
print("Contains SQUEEGEE_RESIDUAL_WATER:", "SQUEEGEE" in code)
