import py_compile
import shutil

TARGET_PATH = r"d:\01.AntiGravity\Space_consult_assist\backend\app\api\v1\endpoints\canonical_symptoms.py"
BACKUP_PATH = r"d:\01.AntiGravity\Space_consult_assist\backend\app\api\v1\endpoints\canonical_symptoms.py.bak"

shutil.copyfile(TARGET_PATH, BACKUP_PATH)
print("Backup created at:", BACKUP_PATH)
