"""
config_manager.py
설정을 config.json 파일로 저장/로드합니다.
전사 단일 통합 표준 프롬프트 (call_type 포함) 적용
"""
import json
import os
from pathlib import Path

CONFIG_FILE = Path(__file__).parent / "config.json"

DEFAULT_PROMPT = """다음은 산업용 청소장비(습식 바닥세정기/건식 청소차) 고객 상담 전화의 음성인식(STT) 전사 텍스트입니다.
현장 관리자(고객)와 상담사 간의 대화 내용을 면밀히 분석하여, 아래 4대 표준 규칙과 작성 지침에 따라 100% 순수 한글 JSON 형식으로만 응답하세요.
영어 단어, 영문 키(Key), 마크다운 코드블록(```)을 절대 포함하지 마세요.

【1. 통화유형 분류 기준 - 필수 선택】
- "기술문의": 장비 고장, 이상 증상, 수리 요청, 부품 파손/누수, 점검 관련 통화
- "영업문의": 신규 구매, 장비 임대/렌탈 단가, 견적서, 카탈로그 요청, 사양 문의 통화
- "일정조율": 장비 납품/배송 일정, 회수 일정, AS 기사 방문 시간 조율 통화
- "기타": 단순 연락처 문의, 부서 연결, 개인 잡담, 잘못 걸려온 전화 등

【2. 증상 계통분류 목록 (기술문의 시 필수 매핑)】
- "흡입계통": 물 흡입 안됨, 오수 흡입 불량, 잔수 남음, 흡입모터 굉음, 호스 막힘, 스퀴지 들뜸
- "브러시/구동계통": 브러시 회전 안됨, 브러시 모터 과열, 바퀴 헛돎, 주행 레버 불량, 전후진 불가, 구동 소음
- "배터리/전원계통": 충전 안됨, 배터리 방전, 전원 스위치 무반응, 키박스 불량, 메인 퓨즈 단락, 충전기 불량
- "급수/세제계통": 세정수 안 나옴, 솔레노이드 밸브 막힘, 급수 펌프 고장, 호스 누수, 물탱크 필터 막힘
- "외관/섀시/바디": 범퍼 찌그러짐, 브러시 커버 깨짐, 섀시 프레임 균열, 바퀴 지지대 파손, 외관 손상
- "소모품/액세서리": 패드 마모, 스퀴지 고무날 마모, 세제 보충, 단순 소모품 교체
- "단순문의/업무무관": 고장 증상 없음 (영업문의, 일정조율, 단순 질의 시 선택)

【3. 조치유형 분류 목록 (기술문의 시 필수 매핑)】
- "유선자가조치": 사진/동영상 요청, 필터/거름망 청소 안내, 리셋 버튼 안내, 호스 이물질 제거 안내 (무료)
- "소모품택배발송": 스퀴지 고무, 필터, 호스 등 단순 소모성 부품 택배 발송 안내
- "정비사현장방문": 본사 전문 정비사 출장 방문 점검 및 현장 수리 일정 접수
- "대차교체": 현장 고장 장비 즉시 회수 및 동급 대체 장비 출고 교환 접수
- "단순상담안내": 견적서 발송, 일정 확인, 부서 안내, 기본 상담 종료

【4. 엄격한 작성 규칙】
1. 영문 배제: 영어 단어(예: summary, call_type, repair, battery, error 등)를 절대 쓰지 말고 100% 자연스러운 한글로만 작성하세요.
2. 줄바꿈 금지: 문자열 내부에 줄바꿈(\n)을 넣지 말고 매끄러운 한 줄 문장으로 완성하세요.
3. 고장이 없는 통화(영업/일정/기타)는 증상목록과 조치목록을 빈 배열([])로 출력하세요.

【출력 형식 (순수 한글 JSON 스키마)】
{
  "통화유형": "기술문의",
  "증상목록": [
    {
      "계통분류": "계통분류명",
      "핵심어구": "고객 발화 핵심 어구",
      "세부증상": "확인된 구체적 이상 증상"
    }
  ],
  "조치목록": [
    {
      "조치유형": "조치유형명",
      "조치내용": "안내하거나 처리한 조치 내용",
      "처리결과": "처리 결과 및 향후 계획"
    }
  ],
  "한줄요약": "상담 대화 전체에 대한 핵심 요약 한 줄"
}"""

DEFAULT_CONFIG = {
    "engine_type": "ollama",            # "ollama" 또는 "gemini"
    "ollama_url": "http://localhost:11434",
    "model": "space-slm-0.5b:v2",
    "model_list": [],
    "gemini_api_key": "",
    "gemini_model": "gemini-3.7-flash",
    "gemini_model_list": [],
    "whisper_model": "sensevoice-small",        # sensevoice-small, base, small, medium, large-v3-turbo, custom-tiny-ko
    "whisper_device": "auto",             # auto, cpu, cuda
    "process_mode": "all",                # "all" (1+2단계), "stt_only" (1단계만), "llm_only" (2단계만)
    "threads": 1,
    "skip_bytes": 512,
    "prompt": DEFAULT_PROMPT,
    "stage3_prompt": DEFAULT_PROMPT,
    "last_input_folder": "D:/스페이스_원본",
    "last_output_folder": "D:/스페이스_테스트",
    "input_audio_dir": "D:/스페이스_원본",
    "stt_text_dir": "D:/스페이스_테스트/stt_texts",
    "completed_audio_dir": "D:/스페이스_테스트/completed_audio",
    "result_json_dir": "D:/스페이스_테스트/result_json",
}


def load_config() -> dict:
    """config.json을 읽어 설정 딕셔너리를 반환합니다. 없으면 기본값을 반환합니다."""
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            # 새 키가 추가됐을 때 기본값으로 병합
            merged = {**DEFAULT_CONFIG, **data}
            return merged
        except Exception:
            pass
    return dict(DEFAULT_CONFIG)


def save_config(config: dict) -> None:
    """설정 딕셔너리를 config.json에 저장합니다."""
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)


def get_default_prompt() -> str:
    return DEFAULT_PROMPT


def get_stage3_default_prompt() -> str:
    return DEFAULT_PROMPT
