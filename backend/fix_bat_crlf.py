bat_content = """@echo off
title Space Advisor STT Server (RTX 5080)
cls
echo [Space Advisor] Starting Faster-Whisper Large-v3 GPU STT Server...
echo URL: http://127.0.0.1:8000
echo.
cd /d "D:\\GoogleDrive\\RPA_dev\\01.AntiGravity\\Space_consult_assist\\backend"
"C:\\Users\\이정용\\AppData\\Local\\Programs\\Python\\Python311\\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000
pause
"""

with open(r"D:\GoogleDrive\RPA_dev\01.AntiGravity\Space_consult_assist\start_backend_stt.bat", "wb") as f:
    f.write(bat_content.replace("\n", "\r\n").encode("cp949"))

print("start_backend_stt.bat converted to CP949 with CRLF successfully!")
