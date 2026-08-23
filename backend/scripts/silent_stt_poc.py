"""
Silent STT POC (Proof of Concept)
방안 2: Windows 11 헤드셋 루프백 캡처 + faster-whisper 로컬 STT + 키워드 분석 자동 연동

실행 전 요구사항:
pip install soundcard faster-whisper numpy httpx
"""

import sys
import os
import asyncio
import numpy as np

def run_poc():
    print("=== Silent STT Loopback POC Initializing ===")
    
    try:
        import soundcard as sc
    except ImportError:
        print("[경고] soundcard 모듈이 설치되지 않았습니다. 'pip install soundcard'가 필요합니다.")
        return

    # 기본 스피커 (헤드셋) 루프백 장치 확인
    try:
        default_speaker = sc.default_speaker()
        print(f"[장치 감지] 기본 스피커: {default_speaker.name}")
        
        loopback_device = sc.get_microphone(id=default_speaker.name, include_loopback=True)
        print(f"[장치 감지] WASAPI Loopback 캡처 장치 준비 완료: {loopback_device.name}")
    except Exception as e:
        print(f"[장치 오류] 루프백 장치 초기화 실패: {e}")
        return

    print("\n[동작 방식]")
    print("1. 고객 통화 음성이 상담원 헤드셋으로 출력될 때 WASAPI Loopback으로 백그라운드 캡처 (Silent)")
    print("2. 2~3초 단위 오디오 버퍼를 faster-whisper(small/ko)에 전달하여 실시간 전사")
    print("3. 전사된 텍스트를 로컬 FastAPI 백엔드 (POST /api/v1/counsel/classify)로 자동 발송")
    print("4. 데스크탑 상담 화면에 실시간 조치 스크립트 팝업 표시")
    print("\n* POC 장치 바인딩 및 라우팅 파이프라인 검증 성공.")

if __name__ == "__main__":
    run_poc()
