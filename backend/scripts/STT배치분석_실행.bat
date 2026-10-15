@echo off
chcp 65001 > nul
title STT 배치 분석 (gemma3:12b)
echo.
echo  ================================================
echo   STT 통화록 배치 분석 시작
echo   모델  : gemma3:12b
echo   대상  : D:\스페이스_테스트\stt_texts
echo   로그  : D:\스페이스_테스트\batch_run.log
echo   중단시: Ctrl+C 후 재실행하면 이어받기 자동 적용
echo  ================================================
echo.

python -X utf8 "D:\01.AntiGravity\Space_consult_assist\backend\scripts\batch_analyze_stt.py"

echo.
echo  ================================================
echo   배치 완료 또는 중단됨
echo   로그 확인: D:\스페이스_테스트\batch_run.log
echo  ================================================
echo.
pause
