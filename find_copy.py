import os
import shutil

src_root = "D:\\"
target = r"D:\GoogleDrive\RPA_dev\01.AntiGravity\Space_consult_assist\backend\scripts\fact.csv"

for root, dirs, files in os.walk(src_root):
    if "fact.csv" in files:
        if "ensemble_master" in root or "analytics" in root:
            full_path = os.path.join(root, "fact.csv")
            print(f"Found: {full_path}")
            shutil.copy(full_path, target)
            print("Copied!")
            break
