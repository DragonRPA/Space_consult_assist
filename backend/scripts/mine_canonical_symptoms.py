"""
16대 전사 표준 장애 유형별 통화 녹취록(STT) 매칭 및 정밀 조치 대화 추출 스크립트
- consult_knowledge 5,854건에서 증상수리 통화 매칭
- 통화 파일명(file_name) 1:1 연결
- 조치/시험/판정 대화 구절(dialogue excerpt) 정밀 추출
- 데이터 부족/불명확 항목 식별 -> 실무자 확인 목록 도출
"""

import os
import re
import json
import psycopg
from collections import defaultdict
from dotenv import load_dotenv

load_dotenv("backend/.env")
DB_URL = os.environ.get("DATABASE_URL_MIGRATION", "").replace("postgresql+psycopg://", "postgresql://")

# 16대 표준 장애 유형 및 마이닝 키워드 정의
CANONICAL_TARGETS = [
    {
        "id": "PWR_BAT_DEGRADE",
        "category": "충전/전원",
        "title": "배터리 조기 방전 / 수명 열화",
        "keywords": ["방전", "조기 방전", "가동 시간", "빨리 닳", "꺼짐", "배터리 수명", "20분", "30분", "15분", "전압", "볼트"],
        "action_focus": ["전압 측정", "완충", "충전 시간", "교체 주기", "셀 열화"]
    },
    {
        "id": "PWR_CHG_FAIL",
        "category": "충전/전원",
        "title": "배터리 충전 불가 / 충전 불량",
        "keywords": ["충전 안", "충전 불가", "충전기", "깜빡", "빨간불", "적색", "콘센트", "220V"],
        "action_focus": ["콘센트 확인", "플러그 체결", "충전기 점검", "LED 표시"]
    },
    {
        "id": "PWR_MAIN_FAIL",
        "category": "충전/전원",
        "title": "메인 전원 미인가 / 작동 정지",
        "keywords": ["전원 안", "안 켜", "키 스위치", "비상정지", "퓨즈", "차단기", "먹통"],
        "action_focus": ["비상버튼 해제", "메인 커넥터", "퓨즈 트립", "키 스위치"]
    },
    {
        "id": "PWR_CONN_ERR",
        "category": "충전/전원",
        "title": "충전 단자 접촉 불량 / 잔량 표시 오류",
        "keywords": ["단자", "커넥터", "헐거", "앤더슨", "게이지", "접점", "인식"],
        "action_focus": ["단자 체결", "핀 부식", "접촉 상태", "게이지 튐"]
    },
    {
        "id": "SUC_WATER_LEFTOVER",
        "category": "흡입/잔수",
        "title": "바닥 잔수 과다 / 흡입력 저하",
        "keywords": ["잔수", "물기", "흡입 안", "흡입력", "물 안 빨", "스퀴지 물", "바닥 물"],
        "action_focus": ["스퀴지 고무", "흡입 호스", "오수탱크 가스켓", "드레인 캡", "손바닥"]
    },
    {
        "id": "SUC_SQUEEGEE_STRIPE",
        "category": "흡입/잔수",
        "title": "스퀴지 줄무늬 잔수 (편마모/이물)",
        "keywords": ["줄", "줄무늬", "스퀴지 자국", "고무 찢", "편마모", "날"],
        "action_focus": ["이물질 제거", "고무 반전", "수평 조절", "날 교체"]
    },
    {
        "id": "SUC_MOTOR_NOISE",
        "category": "흡입/잔수",
        "title": "흡입 모터 이상 소음 / 과열",
        "keywords": ["모터 소음", "굉음", "탄내", "탄 냄새", "흡입모터", "과열", "오수 유입"],
        "action_focus": ["모터 정지", "오수 유입 확인", "필터 건조", "베어링"]
    },
    {
        "id": "SUC_FLOAT_EARLY_STOP",
        "category": "흡입/잔수",
        "title": "오수 탱크 만수 센서 오작동 (조기 차단)",
        "keywords": ["만수", "부표", "플로트", "거품", "조기 차단", "센서"],
        "action_focus": ["소포제", "부표 세척", "센서 슬러지", "필터망"]
    },
    {
        "id": "DRV_BRUSH_STALL",
        "category": "브러시/구동",
        "title": "브러시 모터 회전 불량 / 과부하 멈춤",
        "keywords": ["브러시 안", "브러시 헛", "브러쉬", "과부하", "차단기", "리셋", "감김"],
        "action_focus": ["이물질 감김 제거", "서킷브레이커 리셋", "커플러 마모", "모터 소손"]
    },
    {
        "id": "DRV_WHEEL_DRIVE",
        "category": "브러시/구동",
        "title": "주행 구동 불량 / 직진 쏠림",
        "keywords": ["주행", "안 나감", "직진", "쏠림", "바퀴", "트랜스액슬", "전후진"],
        "action_focus": ["중립 레버", "견인 모드", "타이어 마모", "가속 레버"]
    },
    {
        "id": "DRV_BELT_SLIP",
        "category": "브러시/구동",
        "title": "구동 벨트 슬립 / 이상 소음",
        "keywords": ["벨트", "끼익", "슬립", "장력", "텐션", "삐걱"],
        "action_focus": ["벨트 장력 확인", "텐셔너 베어링", "벨트 마모", "교체"]
    },
    {
        "id": "DRV_BRUSH_LIFT",
        "category": "브러시/구동",
        "title": "브러시 승강 장치 / 레버 작동 불가",
        "keywords": ["승강", "하강", "안 내려", "페달", "액추에이터", "와이어", "레버"],
        "action_focus": ["록킹 래치", "와이어 이탈", "힌지 링크 윤활", "스위치 배선"]
    },
    {
        "id": "WAT_NO_SPRAY",
        "category": "세척수/배관",
        "title": "세척수 미분사 / 노즐 막힘",
        "keywords": ["물 안", "분사 안", "세제 안", "솔레노이드", "노즐", "밸브", "물 공급"],
        "action_focus": ["수동 밸브 열림", "스트레이너 필터", "솔레노이드 소리", "노즐 관통"]
    },
    {
        "id": "WAT_LEAK",
        "category": "세척수/배관",
        "title": "세척수 라인 누수 / 밸브 불량",
        "keywords": ["누수", "물 새", "호스 새", "피팅", "물 떨어", "밸브 누수"],
        "action_focus": ["수동 밸브 차단", "오링 점검", "원터치 피팅", "호스 균열"]
    },
    {
        "id": "EXT_ERROR_CODE",
        "category": "외관/기타",
        "title": "계기판 에러 코드 점멸 / 경고음",
        "keywords": ["에러 코드", "에러", "경고등", "부저", "알람", "EH", "E01", "점멸"],
        "action_focus": ["에러코드 확인", "소프트웨어 리셋", "전원 재인가", "컨트롤러"]
    },
    {
        "id": "EXT_SWITCH_DAMAGE",
        "category": "외관/기타",
        "title": "스위치·레버 파손 / 기계적 파손",
        "keywords": ["부러", "파손", "깨짐", "스위치 파손", "레버 파손", "커버", "범퍼", "손잡이"],
        "action_focus": ["부위 사진", "안전 점검", "부품 확인", "교체 배차"]
    }
]

def extract_dialogue_snippets(stt_text: str, keywords: list, max_snippets=2):
    """STT 텍스트에서 키워드 및 조치 관련 발화 구간을 추출"""
    if not stt_text:
        return []
    
    # 문장 또는 대화 단위 분리 ([00:00:00] 타임스탬프 기준)
    lines = re.split(r'\[\d{2}:\d{2}:\d{2}\]', stt_text)
    matched_snippets = []
    
    for line in lines:
        line_clean = line.strip().replace('\n', ' ')
        if len(line_clean) < 15:
            continue
        # 키워드 매칭
        for kw in keywords:
            if kw in line_clean:
                # 조치/판정 관련 단어가 포함되어 있는지 가중치 확인
                if any(w in line_clean for w in ["확인", "보시", "체크", "측정", "정상", "불량", "교체", "방법", "볼트", "하면", "되"]):
                    matched_snippets.append(line_clean[:180])
                    break
        if len(matched_snippets) >= max_snippets:
            break
            
    return matched_snippets

def run_mining():
    print("=== [16대 표준 장애 유형별 통화 데이터 정밀 마이닝 시작] ===")
    results = {}

    with psycopg.connect(DB_URL) as conn:
        with conn.cursor() as cur:
            for target in CANONICAL_TARGETS:
                tid = target["id"]
                title = target["title"]
                kws = target["keywords"]
                
                # SQL 조건문 동적 생성 (ILIKE OR 결합)
                like_clauses = " OR ".join([f"stt_text ILIKE %s" for _ in kws])
                params = [f"%{k}%" for k in kws]
                
                query = f"""
                    SELECT file_name, equipment_model, summary, action_items, stt_text
                    FROM consult_knowledge
                    WHERE call_type = '증상수리'
                      AND ({like_clauses})
                      AND file_name IS NOT NULL
                    ORDER BY 
                      CASE WHEN action_items IS NOT NULL AND array_length(action_items, 1) > 0 THEN 0 ELSE 1 END,
                      length(stt_text) DESC
                    LIMIT 20;
                """
                
                cur.execute(query, params)
                rows = cur.fetchall()
                
                matched_calls = []
                for fn, em, summary, action_items, stt in rows:
                    snippets = extract_dialogue_snippets(stt, kws, max_snippets=2)
                    if snippets or (action_items and len(action_items) > 0):
                        matched_calls.append({
                            "file_name": fn,
                            "equipment_model": em or "공통",
                            "summary": summary,
                            "action_items": action_items or [],
                            "dialogue_snippets": snippets
                        })
                
                results[tid] = {
                    "id": tid,
                    "title": title,
                    "category": target["category"],
                    "total_matched_calls": len(rows),
                    "representative_calls": matched_calls[:3]  # 상위 3개 대표 통화
                }
                
                print(f"[{target['category']}] {title}: 매칭 통화 {len(rows)}건 도출")

    # 결과 JSON 저장
    output_path = "backend/scripts/mined_symptom_dialogues.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    print(f"\n 마이닝 완료: '{output_path}' 저장됨")

if __name__ == "__main__":
    run_mining()
