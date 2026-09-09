@echo off
chcp 65001 > nul
cd /d "%~dp0"
title ConsultParser2 (m4a ^> txt ^> json)

echo ===================================================
echo   ConsultParser2 - m4a ^> txt ^> json 통합 파이프라인
echo ===================================================

set "QT_QPA_PLATFORM_PLUGIN_PATH=%LOCALAPPDATA%\Programs\Python\Python311\Lib\site-packages\PyQt5\Qt5\plugins\platforms"

where python >nul 2>nul
if %errorlevel% equ 0 (
    python main.py
) else if exist "C:\ProgramData\anaconda3\python.exe" (
    "C:\ProgramData\anaconda3\python.exe" main.py
) else (
    echo [ERROR] Python not found in PATH!
    pause
    exit /b 1
)

if errorlevel 1 (
    echo.
    echo [ERROR] Application crashed or finished with error.
    pause
)
