import os

TARGET_FILE = r"d:\01.AntiGravity\Space_consult_assist\backend\app\api\v1\endpoints\canonical_symptoms.py"

# Read existing code
with open(TARGET_FILE, "r", encoding="utf-8") as f:
    orig = f.read()

# Let's check sections
header_end = orig.find("OFFICIAL_12_ERROR_CODES: List[Dict[str, Any]] = [")
error_codes_end = orig.find("CANONICAL_FAILURE_TYPES: List[Dict[str, Any]] = [")

print("Header end:", header_end)
print("Error codes end:", error_codes_end)
