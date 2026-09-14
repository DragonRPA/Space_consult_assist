import os
from pathlib import Path

root_dir = Path(__file__).resolve().parents[1]
bat_path = root_dir / "start_backend_stt.bat"

bat_content = """@echo off
title Space Advisor STT Server
cls
echo [Space Advisor] Starting Faster-Whisper Large-v3 GPU STT Server...
echo URL: http://127.0.0.1:8000
echo.
cd /d "%~dp0backend"
if exist "%LOCALAPPDATA%\\Programs\\Python\\Python311\\python.exe" (
    "%LOCALAPPDATA%\\Programs\\Python\\Python311\\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000
) else (
    python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
)
pause
"""

with open(bat_path, "wb") as f:
    f.write(bat_content.replace("\n", "\r\n").encode("ascii"))

print(f"{bat_path} written successfully!")

