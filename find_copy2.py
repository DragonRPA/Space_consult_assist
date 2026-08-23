import os
import shutil
import glob

# Try to glob it
matches = glob.glob("D:/*스페이스_테스트*/ensemble_master/*/fact.csv")
if matches:
    print(f"Found: {matches[0]}")
    shutil.copy(matches[0], r"D:\GoogleDrive\RPA_dev\01.AntiGravity\Space_consult_assist\backend\scripts\fact.csv")
    print("Copied!")
else:
    print("Not found via glob")
