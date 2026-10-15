@echo off
chcp 65001 > nul
title STT Batch Analyzer (gemma3:12b)
echo.
echo  ================================================
echo   STT Batch Analysis Start
echo   Model  : gemma3:12b
echo   Target : D:\stt_texts
echo   Log    : D:\batch_run.log
echo   Resume : re-run after Ctrl+C to continue
echo  ================================================
echo.
python -X utf8 "D:\01.AntiGravity\Space_consult_assist\backend\scripts\batch_analyze_stt.py"
echo.
echo  ================================================
echo   Done or interrupted.
echo   Log: D:\batch_run.log
echo  ================================================
echo.
pause
