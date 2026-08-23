@echo off
title Space Advisor STT Server (RTX 5080)
cls
echo [Space Advisor] Starting Faster-Whisper Large-v3 GPU STT Server...
echo URL: http://127.0.0.1:8000
echo.
cd /d "D:\GoogleDrive\RPA_dev\01.AntiGravity\Space_consult_assist\backend"
"C:\Users\¿Ã¡§øÎ\AppData\Local\Programs\Python\Python311\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000
pause
