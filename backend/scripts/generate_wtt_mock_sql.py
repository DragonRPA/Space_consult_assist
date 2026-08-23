import os
import uuid
import hashlib

def gen_sql():
    sql = []
    sql.append("-- ==========================================================")
    sql.append("-- Space Advisor WTT 모의 실운영 데이터 주입 SQL 스크립트")
    sql.append("-- 목적: WTT 검증 시나리오 5종 및 실무 운영 시뮬레이션 데이터 적재")
    sql.append("-- ==========================================================\n")
    sql.append("BEGIN;\n")

    # 1. 직원 데이터 (상담원 및 현장정비사)
    emp_counselor_id = "11111111-1111-1111-1111-111111111111"
    emp_field1_id = "22222222-2222-2222-2222-222222222222"
    emp_field2_id = "33333333-3333-3333-3333-333333333333"

    sql.append("-- 1. 직원 데이터 (employees)")
    sql.append(f"""INSERT INTO employees (id, name, phone)
VALUES 
('{emp_counselor_id}', '이지은 상담사', '010-1111-2222'),
('{emp_field1_id}', '김철수 정비기사', '010-3333-4444'),
('{emp_field2_id}', '박영호 정비기사', '010-5555-6666')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone;
""")

    # 2. 고객사 데이터
    cust_1_id = "a1111111-1111-1111-1111-111111111111"
    cust_2_id = "a2222222-2222-2222-2222-222222222222"
    cust_3_id = "a3333333-3333-3333-3333-333333333333"
    cust_4_id = "a4444444-4444-4444-4444-444444444444"

    sql.append("-- 2. 고객사 데이터 (customers)")
    sql.append(f"""INSERT INTO customers (id, company_name, manager, phone, address, address_detail, business_type)
VALUES 
('{cust_1_id}', '(주)스페이스클린 강남점', '최관리', '010-9123-4567', '서울 강남구 테헤란로 123', '지하 1층 방재실', '빌딩관리'),
('{cust_2_id}', '(주)미래물류센터 평택점', '정센터장', '010-8234-5678', '경기 평택시 산단로 45', '1층 물류데크', '물류창고'),
('{cust_3_id}', '한국유통 판교본점', '강팀장', '010-7345-6789', '경기 성남시 분당구 판교역로 100', '지하 2층 하역장', '대형마트'),
('{cust_4_id}', '(주)글로벌팩토리 화성', '윤공장장', '010-6456-7890', '경기 화성시 반월산단로 88', 'A동 생산라인', '제조공장')
ON CONFLICT (id) DO UPDATE SET company_name = EXCLUDED.company_name, phone = EXCLUDED.phone;
""")

    # 3. 장비 자산 데이터 (assets)
    asset_1_id = "b1111111-1111-1111-1111-111111111111"
    asset_2_id = "b2222222-2222-2222-2222-222222222222"
    asset_3_id = "b3333333-3333-3333-3333-333333333333"

    sql.append("-- 3. 자산 데이터 (assets)")
    sql.append(f"""INSERT INTO assets (id, model_name, serial_number, sales_type, sales_date, sales_price)
VALUES 
('{asset_1_id}', 'SC-500 프리미엄 습식청소기', 'SN-2025-SC500-089', '임대(렌탈)', '2025-03-10', 4500000),
('{asset_2_id}', 'SC-800 대형 탑승형청소기', 'SN-2024-SC800-012', '임대(렌탈)', '2024-07-20', 12000000),
('{asset_3_id}', 'DR-300 소형 보행식청소기', 'SN-2025-DR300-105', '판매', '2025-01-15', 2800000)
ON CONFLICT (serial_number) DO UPDATE SET model_name = EXCLUDED.model_name;
""")

    # 4. 부품 카탈로그 및 실재고 (parts)
    part_1_id = "c1111111-1111-1111-1111-111111111111"
    part_2_id = "c2222222-2222-2222-2222-222222222222"
    part_3_id = "c3333333-3333-3333-3333-333333333333"
    part_4_id = "c4444444-4444-4444-4444-444444444444"
    part_5_id = "c5555555-5555-5555-5555-555555555555"

    sql.append("-- 4. 부품 카탈로그 및 재고 (parts)")
    sql.append(f"""INSERT INTO parts (id, name, compatible_models, unit_price, stock, note, expected_lifespan)
VALUES 
('{part_1_id}', '24V 솔레노이드 급수밸브', 'SC-500, SC-800', 45000, 28, '급수 차단/인가 밸브', '2년'),
('{part_2_id}', '흡입모터 24V 500W', 'SC-500, SC-800, DR-300', 180000, 14, '폐수 흡입용 모터 어셈블리', '3년'),
('{part_3_id}', '메인 배터리 충전기 24V 25A', '전 모델 공용', 250000, 9, '급속 자동 충전기', '5년'),
('{part_4_id}', '내마모성 우레탄 스퀴지 블레이드 800mm', 'SC-800', 35000, 50, '하단 오수 밀대 고무', '6개월'),
('{part_5_id}', '구동 브러시 모터 24V 400W', 'SC-500', 210000, 7, '바닥 세척 회전 모터', '3년')
ON CONFLICT (id) DO UPDATE SET stock = EXCLUDED.stock, unit_price = EXCLUDED.unit_price;
""")

    # 5. 상담 이력 (consult_logs)
    consult_1_id = "d1111111-1111-1111-1111-111111111111"
    consult_2_id = "d2222222-2222-2222-2222-222222222222"
    consult_3_id = "d3333333-3333-3333-3333-333333333333"

    sql.append("-- 5. 상담 접수 이력 (consult_logs)")
    sql.append(f"""INSERT INTO consult_logs (id, timestamp, customer_name, manager, serial_number, model_name, keyword, symptom, action, is_completed, is_visit_required, receiver_id)
VALUES 
('{consult_1_id}', '2026-08-23 09:30:00+09', '(주)스페이스클린 강남점', '최관리', 'SN-2025-SC500-089', 'SC-500 프리미엄 습식청소기', '세제 탱크에 거품 발생', '세제통 내 거품이 과다 발생하여 흡입구로 역류 의심', '1차 셀프조치 안내 후 증상 재발 우려로 출장 요청 접수', true, true, '{emp_counselor_id}'),
('{consult_2_id}', '2026-08-23 10:45:00+09', '(주)미래물류센터 평택점', '정센터장', 'SN-2024-SC800-012', 'SC-800 대형 탑승형청소기', '흡입 모터 굉음 및 흡입력 저하', '작동 중 흡입 모터 쪽에서 진동 및 타는 냄새 동반 굉음 발생', '즉시 전원 차단 안내 및 긴급 정비 출장 배정', true, true, '{emp_counselor_id}'),
('{consult_3_id}', '2026-08-23 11:20:00+09', '한국유통 판교본점', '강팀장', 'SN-2025-DR300-105', 'DR-300 소형 보행식청소기', '배터리 충전 불량', '충전기 플러그 연결 시 충전 표시등 점멸 안함', '벽면 콘센트 전압 확인 및 케이블 재체결 셀프조치로 정상 충전 확인 완료', true, false, '{emp_counselor_id}')
ON CONFLICT (id) DO UPDATE SET symptom = EXCLUDED.symptom;
""")

    # 6. 현장 출장 대장 (visits) - 상태별 (접수, 진행중, 완료)
    visit_1_id = "e1111111-1111-1111-1111-111111111111"
    visit_2_id = "e2222222-2222-2222-2222-222222222222"
    visit_3_id = "e3333333-3333-3333-3333-333333333333"

    sql.append("-- 6. 현장 출장 대장 (visits)")
    sql.append(f"""INSERT INTO visits (id, timestamp, customer_id, customer_name, manager, phone, address, address_detail, consult_id, employee_id, request_note, status, note)
VALUES 
('{visit_1_id}', '2026-08-23 09:35:00+09', '{cust_1_id}', '(주)스페이스클린 강남점', '최관리', '010-9123-4567', '서울 강남구 테헤란로 123', '지하 1층 방재실', '{consult_1_id}', '{emp_field1_id}', '세제 탱크 거품 역류 점검 및 솔레노이드 밸브 교체 요청', '완료', '솔레노이드 밸브 1개 신품 교체 및 소포제 투입 가이드 전달 완료'),
('{visit_2_id}', '2026-08-23 10:50:00+09', '{cust_2_id}', '(주)미래물류센터 평택점', '정센터장', '010-8234-5678', '경기 평택시 산단로 45', '1층 물류데크', '{consult_2_id}', '{emp_field2_id}', '흡입모터 굉음 및 발열 긴급 수리 점검', '진행중', '모터 분해 점검 중 베어링 파손 확인, 모터 어셈블리 교체 작업 중'),
('{visit_3_id}', '2026-08-23 14:10:00+09', '{cust_4_id}', '(주)글로벌팩토리 화성', '윤공장장', '010-6456-7890', '경기 화성시 반월산단로 88', 'A동 생산라인', NULL, '{emp_field1_id}', '스퀴지 고무 마모로 바닥 물기 잔류 점검 요청', '접수', NULL)
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note;
""")

    # 7. 출장 상태 전이 이력 (visit_status_history)
    sql.append("-- 7. 출장 상태 전이 이력 체인 (visit_status_history)")
    sql.append(f"""INSERT INTO visit_status_history (id, visit_id, old_status, new_status, client_type, changed_at, changed_by)
VALUES 
-- visit_1 (접수 -> 진행중 -> 완료)
('{str(uuid.uuid4())}', '{visit_1_id}', NULL, '접수', 'desktop', '2026-08-23 09:35:00+09', '{emp_counselor_id}'),
('{str(uuid.uuid4())}', '{visit_1_id}', '접수', '진행중', 'mobile', '2026-08-23 11:15:00+09', '{emp_field1_id}'),
('{str(uuid.uuid4())}', '{visit_1_id}', '진행중', '완료', 'mobile', '2026-08-23 12:30:00+09', '{emp_field1_id}'),

-- visit_2 (접수 -> 진행중)
('{str(uuid.uuid4())}', '{visit_2_id}', NULL, '접수', 'desktop', '2026-08-23 10:50:00+09', '{emp_counselor_id}'),
('{str(uuid.uuid4())}', '{visit_2_id}', '접수', '진행중', 'mobile', '2026-08-23 13:40:00+09', '{emp_field2_id}'),

-- visit_3 (접수)
('{str(uuid.uuid4())}', '{visit_3_id}', NULL, '접수', 'desktop', '2026-08-23 14:10:00+09', '{emp_counselor_id}')
ON CONFLICT (id) DO NOTHING;
""")

    # 8. 현장 부품 사용 내역 (visit_parts)
    sql.append("-- 8. 현장 부품 사용 내역 (visit_parts)")
    sql.append(f"""INSERT INTO visit_parts (id, visit_id, part_id, quantity, timestamp)
VALUES 
('{str(uuid.uuid4())}', '{visit_1_id}', '{part_1_id}', 1, '2026-08-23 12:15:00+09'),
('{str(uuid.uuid4())}', '{visit_2_id}', '{part_2_id}', 1, '2026-08-23 14:05:00+09')
ON CONFLICT (id) DO NOTHING;
""")

    # 9. 영업 문의 분기 이관 (sales_inquiries)
    sql.append("-- 9. 단순 견적/계약 영업팀 이관 (sales_inquiries)")
    sql.append(f"""INSERT INTO sales_inquiries (id, inquiry_type, customer_name, manager, manager_phone, request_note, is_completed, client_type, timestamp)
VALUES 
('{str(uuid.uuid4())}', '신규 렌탈 견적', '(주)대한빌딩서비스', '송부장', '010-3344-5566', 'SC-800 대형 탑승형 청소기 2대 장기 렌탈 견적서 요청 (지하주차장 청소용)', false, 'desktop', '2026-08-23 13:10:00+09'),
('{str(uuid.uuid4())}', '장비 추가 구매', '(주)센트럴스퀘어', '유팀장', '010-4455-6677', 'DR-300 소형 보행식 3대 신규 납품 계약 일정 및 할인율 문의', true, 'desktop', '2026-08-23 14:40:00+09')
ON CONFLICT (id) DO NOTHING;
""")

    # 10. LLM 추론 로그 (llm_logs)
    p1 = "흡입 모터 쪽에서 진동 및 타는 냄새 동반 굉음 발생"
    h1 = hashlib.sha256(p1.encode('utf-8')).hexdigest()
    
    p2 = "브러시 모터는 도는데 물이 바닥으로 전혀 분사가 안돼요"
    h2 = hashlib.sha256(p2.encode('utf-8')).hexdigest()

    sql.append("-- 10. LLM 추론 로그 (llm_logs)")
    sql.append(f"""INSERT INTO llm_logs (id, prompt_text, prompt_hash, response_text, model_name, latency_ms, is_error, cache_hit, client_type, called_at)
VALUES 
('{str(uuid.uuid4())}', '{p1}', '{h1}', '{{"keyword": "흡입모터 과열 및 소음", "part_code": "SUCTION"}}', 'llama3', 420, false, false, 'desktop', '2026-08-23 10:45:10+09'),
('{str(uuid.uuid4())}', '{p2}', '{h2}', '{{"keyword": "급수 밸브 막힘 및 분사 불량", "part_code": "WATER_SOLENOID"}}', 'llama3', 380, false, false, 'desktop', '2026-08-23 15:20:05+09')
ON CONFLICT (id) DO NOTHING;
""")

    # 11. 감사 로그 (audit_log_minimal)
    sql.append("-- 11. 최소 감사 로그 (audit_log_minimal)")
    sql.append(f"""INSERT INTO audit_log_minimal (id, table_name, record_id, action, changed_by, changed_at)
VALUES 
('{str(uuid.uuid4())}', 'visits', '{visit_1_id}', 'INSERT', '{emp_counselor_id}', '2026-08-23 09:35:00+09'),
('{str(uuid.uuid4())}', 'parts', '{part_1_id}', 'DEDUCT_STOCK', '{emp_field1_id}', '2026-08-23 12:15:00+09'),
('{str(uuid.uuid4())}', 'visits', '{visit_1_id}', 'COMPLETE', '{emp_field1_id}', '2026-08-23 12:30:00+09'),
('{str(uuid.uuid4())}', 'visits', '{visit_2_id}', 'INSERT', '{emp_counselor_id}', '2026-08-23 10:50:00+09')
ON CONFLICT (id) DO NOTHING;
""")

    sql.append("\nCOMMIT;\n")

    out_path = r"D:\GoogleDrive\RPA_dev\01.AntiGravity\Space_consult_assist\backend\scripts\seed_wtt_mock_data.sql"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(sql))

    print(f"Generated WTT Mock SQL Seed: {out_path}")

if __name__ == "__main__":
    gen_sql()
