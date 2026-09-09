import os
import sys
import subprocess
import imageio_ffmpeg

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()

files = [
    r"D:\스페이스_테스트\completed_audio\20260623_110712_0269781026_파싱실패.m4a",
    r"D:\스페이스_테스트\completed_audio\20240508_172449_03180399922_파싱실패.m4a",
    r"D:\스페이스_테스트\completed_audio\20240304_112712_중원대학교(충북)_S5_파싱실패.m4a",
]

for f in files:
    if os.path.exists(f):
        cmd = [FFMPEG_EXE, "-i", f]
        proc = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="ignore")
        for line in proc.stderr.splitlines():
            if "Duration:" in line:
                print(f"{os.path.basename(f)}: {line.strip()}")
