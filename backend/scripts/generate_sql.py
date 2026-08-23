import os
import json
import pandas as pd

csv_path = r"D:\스페이스_테스트\ensemble_master\analytics_gpt-oss_120b_top100\consult_analytics_fact.csv"

DRAFT_SCRIPTS = {
    "SALES_INQUIRY": ["영업상담 및 요구사항 청취", "카탈로그 및 견적서 발송", "모델/스펙 상세 안내", "구매/임대 조건 및 단가 안내", "방문상담 예약 및 영업담당자 배정"],
    "SCHEDULE_DELIVERY": ["원하는 일정 및 시간대 확인", "배송/회수 정확한 주소 확인", "현장 담당자 연락처 재확인", "필요 서류(인수증 등) 및 절차 안내", "출장 스케줄 배정 및 확정"],
    "SUCTION": ["흡입구 및 호스 막힘/이물질 확인", "먼지 필터 청소 또는 교체 안내", "호스 연결부 결합 상태 확인", "오수통 수위 확인 및 비우기 안내", "증상 지속 시 흡입 모터 점검 출장"],
    "POWER": ["전원 스위치 ON/OFF 재시도", "배터리 충전 상태 및 잔량 확인", "충전기 잭 연결 및 220V 확인", "메인 퓨즈 끊어짐 여부 점검", "기판 불량 의심 시 출장 수리"],
    "INQUIRY_ETC": ["문의 사항 상세 내용 청취", "관련 담당 부서 및 프로세스 확인", "타 부서 이관 안내 및 연결", "단순 정보 제공 및 공지 안내", "기타 상담 종료 및 기록"],
    "DRIVE_BRUSH": ["브러시 작동 스위치 상태 확인", "브러시에 걸린 이물질(끈 등) 제거", "브러시 모터 회전음/발열 확인", "벨트 마모 및 장력 상태 점검", "증상 지속 시 구동계 점검 출장"],
    "IRRELEVANT": ["상담 내용 스팸 여부 확인", "스팸 번호 차단 시스템 등록", "업무 무관 사항 정중히 거절", "반복적인 장난전화 시 강제 종료", "상담 이력 특이사항 기록"],
    "WATER_SOLENOID": ["솔레노이드 밸브 전원 인가 확인", "급수 필터 이물질 및 막힘 제거", "밸브 강제 열림/닫힘 테스트", "호스 연결부 누수 부위 특정", "부품 불량 시 출장 교체"],
    "CHASSIS": ["외관 파손 부위(범퍼/섀시) 사진 확보", "파손 경위 및 사용자 과실 파악", "해당 부품 창고 재고 확인", "수리 소요 시간 및 비용 안내", "출장 수리 및 부품 교체 배정"],
    "WATER_NO_FLOW": ["청수통(물통)에 물이 충분한지 보충", "하단 급수 밸브가 열려있는지 확인", "급수 모터(펌프) 작동 소음 확인", "솔레노이드/호스 꺾임 여부 확인", "막힘 지속 시 출장 점검"],
    "BRUSH_WIRE": ["와이어 단선 및 피복 벗겨짐 확인", "연결부 부식 및 체결 상태 확인", "조작 스위치 접점 상태 불량 점검", "와이어 장력 조절 및 윤활", "부품 파손 시 와이어 교체 출장"],
    "BRUSH_COVER": ["브러시 커버 파손 상태 및 간섭 확인", "고정 핀/나사 이탈 및 분실 여부", "사용 중 충돌 등 과실 여부", "커버 부품 재고 및 단가 확인", "출장 수리 시 커버 교체 진행"],
    "FORWARD_FAIL": ["전후진 조작 스위치/레버 오작동 확인", "구동 모터 회전 여부 및 소음 점검", "바퀴 구동축 이물질 걸림 확인", "배터리 잔량이 구동 가능한 수준인지", "모터/기판 불량 시 출장 수리"],
    "WATER_SUPPLY_FAIL": ["청수통 내부 이물질 거름망 청소", "호스 라인 내부 공기 빼기(에어작업)", "급수 펌프 동작 및 전원 확인", "급수 밸브 기계적 고장 확인", "컨트롤 보드 신호 불량 점검"],
    "BRUSH_FAIL": ["모터 과열 방지(휴즈/브레이커) 리셋", "브러시 마모 한계선 도달 여부", "베어링 이음 및 회전축 저항 점검", "모터 장착부 이탈 및 나사 풀림", "스위치 및 릴레이 접점 점검"],
    "CHARGER_FAIL": ["벽면 220V 콘센트 전원 정상 인가 확인", "충전기 전원 LED 점등 상태 확인", "출력 단자 전압 정상(24V/36V 등) 확인", "충전 케이블 단선 및 플러그 파손", "충전기 자체 고장 시 신규 발송"],
    "POWER_FAIL": ["배터리 출력 전압 멀티테스터기 체크", "메인 배터리 휴즈 단락 여부", "키스위치(열쇠) 접점 및 마모 상태", "배터리 터미널 체결 및 부식 확인", "컨트롤러 보드 전원부 점검"],
    "CHARGE_INDICATOR": ["표시등 LED 자체 파손 및 점등 불가", "배터리와의 통신 라인 커넥터 확인", "실제 충전은 되나 불만 안들어오는지", "단자부 먼지 및 수분 청소", "표시등 기판 불량 시 부품 교체"]
}

try:
    df = pd.read_csv(csv_path, encoding='utf-8')
except:
    df = pd.read_csv(csv_path, encoding='cp949')

df = df[~df['사전매핑구분'].isin(['비업무/스팸', '해당없음'])].copy()
df = df[df['사전매칭어구_증상'].notna() & (df['사전매칭어구_증상'].str.strip() != "")]

agg_funcs = {
    '관측치ID': 'count',
    '부품코드': lambda x: x.mode()[0] if not x.empty else 'INQUIRY_ETC',
    '증상대분류': lambda x: x.mode()[0] if not x.empty else '기타',
    '고장중분류': lambda x: x.mode()[0] if not x.empty else None,
    '조치대분류': lambda x: x.mode()[0] if not x.empty else '단순상담안내',
    '조치세부내용': lambda x: x.mode()[0] if not x.empty else '상담안내',
    '비용구분': lambda x: x.mode()[0] if not x.empty else '무료'
}

grouped = df.groupby('사전매칭어구_증상', as_index=False).agg(agg_funcs)

def format_val(v):
    if pd.isna(v) or v is None:
        return "NULL"
    if isinstance(v, str):
        escaped = v.replace("'", "''")
        return f"'{escaped}'"
    return str(v)

chunk_size = 500
file_index = 1
current_values = []
sql_lines = ["BEGIN;"]

for i, row in grouped.iterrows():
    pcode = row['부품코드']
    script = json.dumps(DRAFT_SCRIPTS.get(pcode, []), ensure_ascii=False)
    
    keyword = format_val(row['사전매칭어구_증상'].strip())
    part_code = format_val(pcode)
    cat1 = format_val(row['증상대분류'])
    cat2 = format_val(row['고장중분류'])
    act_cat = format_val(row['조치대분류'])
    act_det = format_val(row['조치세부내용'])
    cost = format_val(row['비용구분'])
    cnt = str(row['관측치ID'])
    conf = "1"
    priority = "100"
    is_active = "true"
    src_engine = "'gemma3:12b'"
    script_esc = format_val(script)
    
    val_str = f"({keyword}, {part_code}, {cat1}, {cat2}, {act_cat}, {act_det}, {cost}, {cnt}, {conf}, {priority}, {is_active}, {src_engine}, {script_esc})"
    current_values.append(val_str)
    
    # When chunk is full or it's the last row
    if len(current_values) >= chunk_size or i == len(grouped) - 1:
        sql_lines.append("""INSERT INTO symptom_rules 
(keyword, part_code, category_l1, category_l2, action_category, action_detail, cost_type, source_count, confidence_tier, priority, is_active, source_engine, action_script)
VALUES""")
        sql_lines.append(",\n".join(current_values))
        sql_lines.append("""ON CONFLICT (keyword, part_code) DO UPDATE 
SET source_count = symptom_rules.source_count + EXCLUDED.source_count,
    action_script = EXCLUDED.action_script;
""")
        sql_lines.append("COMMIT;")
        
        # Write to file
        out_path = f"D:\\GoogleDrive\\RPA_dev\\01.AntiGravity\\Space_consult_assist\\backend\\scripts\\seed_symptom_rules_{file_index}.sql"
        with open(out_path, "w", encoding="utf-8") as f:
            f.write("\n".join(sql_lines))
        print(f"Generated {out_path}")
        
        # Reset for next file
        file_index += 1
        current_values = []
        sql_lines = ["BEGIN;"]

# Cleanup old single file
old_file = r"D:\GoogleDrive\RPA_dev\01.AntiGravity\Space_consult_assist\backend\scripts\seed_symptom_rules.sql"
if os.path.exists(old_file):
    os.remove(old_file)
