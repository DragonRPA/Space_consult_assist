import os
import uuid
import hashlib

def gen_all_sql_seeds():
    # -------------------------------------------------------------
    # 1. Phase 1 (S1-S5) SQL
    # -------------------------------------------------------------
    p1_sql = []
    p1_sql.append("-- ==========================================================")
    p1_sql.append("-- Space Advisor 1차 WTT (S1~S5) 모의 데이터 SQL 스크립트")
    p1_sql.append("-- ==========================================================\n")
    p1_sql.append("BEGIN;\n")

    emp_counselor_id = "11111111-1111-1111-1111-111111111111"
    emp_field1_id = "22222222-2222-2222-2222-222222222222"
    emp_field2_id = "33333333-3333-3333-3333-333333333333"

    p1_sql.append("-- 1. 직원 데이터 (employees)")
    p1_sql.append(f"""INSERT INTO employees (id, name, phone)
VALUES 
('{emp_counselor_id}', '이지은 상담사', '010-1111-2222'),
('{emp_field1_id}', '김철수 정비기사', '010-3333-4444'),
('{emp_field2_id}', '박영호 정비기사', '010-5555-6666')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone;
""")

    cust_1_id = "a1111111-1111-1111-1111-111111111111"
    cust_2_id = "a2222222-2222-2222-2222-222222222222"
    cust_3_id = "a3333333-3333-3333-3333-333333333333"
    cust_4_id = "a4444444-4444-4444-4444-444444444444"

    p1_sql.append("-- 2. 고객사 데이터 (customers)")
    p1_sql.append(f"""INSERT INTO customers (id, name, manager, manager_phone, address, address_detail)
VALUES 
('{cust_1_id}', '(주)스페이스클린 강남점', '최관리', '010-9123-4567', '서울 강남구 테헤란로 123', '지하 1층 방재실'),
('{cust_2_id}', '(주)미래물류센터 평택점', '정센터장', '010-8234-5678', '경기 평택시 산단로 45', '1층 물류데크'),
('{cust_3_id}', '한국유통 판교본점', '강팀장', '010-7345-6789', '경기 성남시 분당구 판교역로 100', '지하 2층 하역장'),
('{cust_4_id}', '(주)글로벌팩토리 화성', '윤공장장', '010-6456-7890', '경기 화성시 반월산단로 88', 'A동 생산라인')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, manager_phone = EXCLUDED.manager_phone;
""")

    asset_1_id = "b1111111-1111-1111-1111-111111111111"
    asset_2_id = "b2222222-2222-2222-2222-222222222222"
    asset_3_id = "b3333333-3333-3333-3333-333333333333"

    p1_sql.append("-- 3. 자산 데이터 (assets)")
    p1_sql.append(f"""INSERT INTO assets (id, model_name, serial_number, sales_type, sales_date, sales_price)
VALUES 
('{asset_1_id}', 'SC-500 프리미엄 습식청소기', 'SN-2025-SC500-089', '임대(렌탈)', '2025-03-10', 4500000),
('{asset_2_id}', 'SC-800 대형 탑승형청소기', 'SN-2024-SC800-012', '임대(렌탈)', '2024-07-20', 12000000),
('{asset_3_id}', 'DR-300 소형 보행식청소기', 'SN-2025-DR300-105', '판매', '2025-01-15', 2800000)
ON CONFLICT (serial_number) DO UPDATE SET model_name = EXCLUDED.model_name;
""")

    part_1_id = "c1111111-1111-1111-1111-111111111111"
    part_2_id = "c2222222-2222-2222-2222-222222222222"
    part_3_id = "c3333333-3333-3333-3333-333333333333"
    part_4_id = "c4444444-4444-4444-4444-444444444444"
    part_5_id = "c5555555-5555-5555-5555-555555555555"

    p1_sql.append("-- 4. 부품 카탈로그 및 재고 (parts)")
    p1_sql.append(f"""INSERT INTO parts (id, name, compatible_models, unit_price, stock, note, expected_lifespan)
VALUES 
('{part_1_id}', '24V 솔레노이드 급수밸브', 'SC-500, SC-800', 45000, 28, '급수 차단/인가 밸브', '2년'),
('{part_2_id}', '흡입모터 24V 500W', 'SC-500, SC-800, DR-300', 180000, 14, '폐수 흡입용 모터 어셈블리', '3년'),
('{part_3_id}', '메인 배터리 충전기 24V 25A', '전 모델 공용', 250000, 9, '급속 자동 충전기', '5년'),
('{part_4_id}', '내마모성 우레탄 스퀴지 블레이드 800mm', 'SC-800', 35000, 50, '하단 오수 밀대 고무', '6개월'),
('{part_5_id}', '구동 브러시 모터 24V 400W', 'SC-500', 210000, 7, '바닥 세척 회전 모터', '3년')
ON CONFLICT (id) DO UPDATE SET stock = EXCLUDED.stock, unit_price = EXCLUDED.unit_price;
""")

    consult_1_id = "d1111111-1111-1111-1111-111111111111"
    consult_2_id = "d2222222-2222-2222-2222-222222222222"
    consult_3_id = "d3333333-3333-3333-3333-333333333333"

    p1_sql.append("-- 5. 상담 접수 이력 (consult_logs)")
    p1_sql.append(f"""INSERT INTO consult_logs (id, timestamp, customer_name, manager, serial_number, model_name, keyword, symptom, action, is_completed, is_visit_required, receiver_id)
VALUES 
('{consult_1_id}', '2026-08-23 09:30:00+09', '(주)스페이스클린 강남점', '최관리', 'SN-2025-SC500-089', 'SC-500 프리미엄 습식청소기', '세제 탱크에 거품 발생', '세제통 내 거품이 과다 발생하여 흡입구로 역류 의심', '1차 셀프조치 안내 후 증상 재발 우려로 출장 요청 접수', true, true, '{emp_counselor_id}'),
('{consult_2_id}', '2026-08-23 10:45:00+09', '(주)미래물류센터 평택점', '정센터장', 'SN-2024-SC800-012', 'SC-800 대형 탑승형청소기', '흡입 모터 굉음 및 흡입력 저하', '작동 중 흡입 모터 쪽에서 진동 및 타는 냄새 동반 굉음 발생', '즉시 전원 차단 안내 및 긴급 정비 출장 배정', true, true, '{emp_counselor_id}'),
('{consult_3_id}', '2026-08-23 11:20:00+09', '한국유통 판교본점', '강팀장', 'SN-2025-DR300-105', 'DR-300 소형 보행식청소기', '배터리 충전 불량', '충전기 플러그 연결 시 충전 표시등 점멸 안함', '벽면 콘센트 전압 확인 및 케이블 재체결 셀프조치로 정상 충전 확인 완료', true, false, '{emp_counselor_id}')
ON CONFLICT (id) DO UPDATE SET symptom = EXCLUDED.symptom;
""")

    visit_1_id = "e1111111-1111-1111-1111-111111111111"
    visit_2_id = "e2222222-2222-2222-2222-222222222222"
    visit_3_id = "e3333333-3333-3333-3333-333333333333"

    p1_sql.append("-- 6. 현장 출장 대장 (visits)")
    p1_sql.append(f"""INSERT INTO visits (id, timestamp, customer_id, customer_name, manager, phone, address, address_detail, consult_id, employee_id, request_note, status, note)
VALUES 
('{visit_1_id}', '2026-08-23 09:35:00+09', '{cust_1_id}', '(주)스페이스클린 강남점', '최관리', '010-9123-4567', '서울 강남구 테헤란로 123', '지하 1층 방재실', '{consult_1_id}', '{emp_field1_id}', '세제 탱크 거품 역류 점검 및 솔레노이드 밸브 교체 요청', '완료', '솔레노이드 밸브 1개 신품 교체 및 소포제 투입 가이드 전달 완료'),
('{visit_2_id}', '2026-08-23 10:50:00+09', '{cust_2_id}', '(주)미래물류센터 평택점', '정센터장', '010-8234-5678', '경기 평택시 산단로 45', '1층 물류데크', '{consult_2_id}', '{emp_field2_id}', '흡입모터 굉음 및 발열 긴급 수리 점검', '진행중', '모터 분해 점검 중 베어링 파손 확인, 모터 어셈블리 교체 작업 중'),
('{visit_3_id}', '2026-08-23 14:10:00+09', '{cust_4_id}', '(주)글로벌팩토리 화성', '윤공장장', '010-6456-7890', '경기 화성시 반월산단로 88', 'A동 생산라인', NULL, '{emp_field1_id}', '스퀴지 고무 마모로 바닥 물기 잔류 점검 요청', '접수', NULL)
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note;
""")

    p1_sql.append("-- 7. 출장 상태 전이 이력 체인 (visit_status_history)")
    p1_sql.append(f"""INSERT INTO visit_status_history (id, visit_id, old_status, new_status, client_type, changed_at, changed_by)
VALUES 
('{str(uuid.uuid4())}', '{visit_1_id}', NULL, '접수', 'desktop', '2026-08-23 09:35:00+09', '{emp_counselor_id}'),
('{str(uuid.uuid4())}', '{visit_1_id}', '접수', '진행중', 'mobile', '2026-08-23 11:15:00+09', '{emp_field1_id}'),
('{str(uuid.uuid4())}', '{visit_1_id}', '진행중', '완료', 'mobile', '2026-08-23 12:30:00+09', '{emp_field1_id}'),

('{str(uuid.uuid4())}', '{visit_2_id}', NULL, '접수', 'desktop', '2026-08-23 10:50:00+09', '{emp_counselor_id}'),
('{str(uuid.uuid4())}', '{visit_2_id}', '접수', '진행중', 'mobile', '2026-08-23 13:40:00+09', '{emp_field2_id}'),

('{str(uuid.uuid4())}', '{visit_3_id}', NULL, '접수', 'desktop', '2026-08-23 14:10:00+09', '{emp_counselor_id}')
ON CONFLICT (id) DO NOTHING;
""")

    p1_sql.append("-- 8. 현장 부품 사용 내역 (visit_parts)")
    p1_sql.append(f"""INSERT INTO visit_parts (id, visit_id, part_id, quantity, timestamp)
VALUES 
('{str(uuid.uuid4())}', '{visit_1_id}', '{part_1_id}', 1, '2026-08-23 12:15:00+09'),
('{str(uuid.uuid4())}', '{visit_2_id}', '{part_2_id}', 1, '2026-08-23 14:05:00+09')
ON CONFLICT (id) DO NOTHING;
""")

    p1_sql.append("-- 9. 단순 견적/계약 영업팀 이관 (sales_inquiries)")
    p1_sql.append(f"""INSERT INTO sales_inquiries (id, inquiry_type, customer_name, manager, manager_phone, request_note, is_completed, client_type, timestamp)
VALUES 
('{str(uuid.uuid4())}', '신규 렌탈 견적', '(주)대한빌딩서비스', '송부장', '010-3344-5566', 'SC-800 대형 탑승형 청소기 2대 장기 렌탈 견적서 요청 (지하주차장 청소용)', false, 'desktop', '2026-08-23 13:10:00+09'),
('{str(uuid.uuid4())}', '장비 추가 구매', '(주)센트럴스퀘어', '유팀장', '010-4455-6677', 'DR-300 소형 보행식 3대 신규 납품 계약 일정 및 할인율 문의', true, 'desktop', '2026-08-23 14:40:00+09')
ON CONFLICT (id) DO NOTHING;
""")

    p1_prompt1 = "흡입 모터 쪽에서 진동 및 타는 냄새 동반 굉음 발생"
    p1_hash1 = hashlib.sha256(p1_prompt1.encode('utf-8')).hexdigest()
    
    p1_prompt2 = "브러시 모터는 도는데 물이 바닥으로 전혀 분사가 안돼요"
    p1_hash2 = hashlib.sha256(p1_prompt2.encode('utf-8')).hexdigest()

    p1_sql.append("-- 10. LLM 추론 로그 (llm_logs)")
    p1_sql.append(f"""INSERT INTO llm_logs (id, prompt_text, prompt_hash, response_text, model_name, latency_ms, is_error, cache_hit, client_type, called_at)
VALUES 
('{str(uuid.uuid4())}', '{p1_prompt1}', '{p1_hash1}', '{{"keyword": "흡입모터 과열 및 소음", "part_code": "SUCTION"}}', 'llama3', 420, false, false, 'desktop', '2026-08-23 10:45:10+09'),
('{str(uuid.uuid4())}', '{p1_prompt2}', '{p1_hash2}', '{{"keyword": "급수 밸브 막힘 및 분사 불량", "part_code": "WATER_SOLENOID"}}', 'llama3', 380, false, false, 'desktop', '2026-08-23 15:20:05+09')
ON CONFLICT (id) DO NOTHING;
""")

    p1_sql.append("-- 11. 감사 로그 (audit_log_minimal)")
    p1_sql.append(f"""INSERT INTO audit_log_minimal (id, table_name, record_id, action, changed_by, changed_at)
VALUES 
('{str(uuid.uuid4())}', 'visits', '{visit_1_id}', 'INSERT', '{emp_counselor_id}', '2026-08-23 09:35:00+09'),
('{str(uuid.uuid4())}', 'parts', '{part_1_id}', 'DEDUCT_STOCK', '{emp_field1_id}', '2026-08-23 12:15:00+09'),
('{str(uuid.uuid4())}', 'visits', '{visit_1_id}', 'COMPLETE', '{emp_field1_id}', '2026-08-23 12:30:00+09'),
('{str(uuid.uuid4())}', 'visits', '{visit_2_id}', 'INSERT', '{emp_counselor_id}', '2026-08-23 10:50:00+09')
ON CONFLICT (id) DO NOTHING;
""")
    p1_sql.append("\nCOMMIT;\n")

    p1_path = r"D:\GoogleDrive\RPA_dev\01.AntiGravity\Space_consult_assist\backend\scripts\seed_wtt_mock_data.sql"
    with open(p1_path, "w", encoding="utf-8") as f:
        f.write("\n".join(p1_sql))
    print(f"Fixed & Saved Phase 1 SQL: {p1_path}")

    # -------------------------------------------------------------
    # 2. Phase 2 (S6-S10) SQL
    # -------------------------------------------------------------
    p2_sql = []
    p2_sql.append("-- ==========================================================")
    p2_sql.append("-- Space Advisor 2차 심화 WTT (S6~S10) 모의 데이터 SQL 스크립트")
    p2_sql.append("-- ==========================================================\n")
    p2_sql.append("BEGIN;\n")

    p2_sql.append("-- 0. 직원 데이터 선행 보장 (employees)")
    p2_sql.append(f"""INSERT INTO employees (id, name, phone)
VALUES 
('{emp_counselor_id}', '이지은 상담사', '010-1111-2222'),
('{emp_field1_id}', '김철수 정비기사', '010-3333-4444'),
('{emp_field2_id}', '박영호 정비기사', '010-5555-6666')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone;
""")

    cust_s7_id = "a7777777-7777-7777-7777-777777777777"
    cust_s8_id = "a8888888-8888-8888-8888-888888888888"
    cust_s9_id = "a9999999-9999-9999-9999-999999999999"
    cust_s10_id = "a1010101-1010-1010-1010-101010101010"

    p2_sql.append("-- 1. 2차 WTT 대상 고객사 데이터 (customers)")
    p2_sql.append(f"""INSERT INTO customers (id, name, manager, manager_phone, address, address_detail)
VALUES 
('{cust_s7_id}', '(주)인천남동정밀', '박공장장', '010-8888-1111', '인천 남동구 남동대로 200', '1공장 프레스룸'),
('{cust_s8_id}', '(주)메가물류센터 지하3층', '임소장', '010-8888-2222', '경기 안성시 일죽면 물류로 50', '지하 3층 저온창고 음영지역'),
('{cust_s9_id}', '(주)현대메디컬센터', '한실장', '010-8888-3333', '서울 서초구 반포대로 150', '별관 3층 수술실 복도'),
('{cust_s10_id}', '(주)케이로지스 화성센터', '오센터장', '010-8888-4444', '경기 화성시 남양읍 남양로 300', 'A동 입출고 하역장')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, manager_phone = EXCLUDED.manager_phone;
""")

    part_rare_id = "c7777777-7777-7777-7777-777777777777"
    p2_sql.append("-- 2. 희귀 특수 부품 (parts)")
    p2_sql.append(f"""INSERT INTO parts (id, name, compatible_models, unit_price, stock, note, expected_lifespan)
VALUES 
('{part_rare_id}', 'SC-800 전용 메인 통신 제어보드 PCB 24V', 'SC-800', 480000, 1, '본사 해외 직수입 고가 통신보드 (창고 잔여 1개 한정)', '5년')
ON CONFLICT (id) DO UPDATE SET stock = EXCLUDED.stock, unit_price = EXCLUDED.unit_price;
""")

    visit_s7_id = "e7777777-7777-7777-7777-777777777777"
    p2_sql.append("-- 3. S-7: 재고 부족 발생 후 '재방문' 전이 출장 (visits)")
    p2_sql.append(f"""INSERT INTO visits (id, customer_id, customer_name, manager, phone, address, address_detail, request_note, status, note, employee_id, timestamp)
VALUES 
('{visit_s7_id}', '{cust_s7_id}', '(주)인천남동정밀', '박공장장', '010-8888-1111', '인천 남동구 남동대로 200', '1공장 프레스룸', '메인 기판 통신 두절 및 장비 멈춤', '재방문', '특수 제어보드 수량 부족(요청 3개/현재고 1개)으로 본사 긴급 출고 후 익일 10시 재방문 교체 예정', '{emp_field1_id}', '2026-08-23 11:00:00+09')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note;
""")

    p2_sql.append(f"""INSERT INTO visit_status_history (id, visit_id, old_status, new_status, client_type, changed_at, changed_by)
VALUES 
('{str(uuid.uuid4())}', '{visit_s7_id}', NULL, '접수', 'desktop', '2026-08-23 11:00:00+09', '{emp_counselor_id}'),
('{str(uuid.uuid4())}', '{visit_s7_id}', '접수', '진행중', 'mobile', '2026-08-23 13:30:00+09', '{emp_field1_id}'),
('{str(uuid.uuid4())}', '{visit_s7_id}', '진행중', '재방문', 'mobile', '2026-08-23 14:15:00+09', '{emp_field1_id}')
ON CONFLICT (id) DO NOTHING;
""")

    visit_s8_id = "e8888888-8888-8888-8888-888888888888"
    p2_sql.append("-- 4. S-8: 오프라인 큐 지연 동기화 출장 (visits & visit_status_history)")
    p2_sql.append(f"""INSERT INTO visits (id, customer_id, customer_name, manager, phone, address, address_detail, request_note, status, note, employee_id, timestamp)
VALUES 
('{visit_s8_id}', '{cust_s8_id}', '(주)메가물류센터 지하3층', '임소장', '010-8888-2222', '경기 안성시 일죽면 물류로 50', '지하 3층 저온창고 음영지역', '급수 밸브 닫힘 불량으로 오수 누출', '완료', '지하 통신 음영지역에서 솔레노이드 밸브 교체 완료 후 지상 이동하여 동기화 완료', '{emp_field2_id}', '2026-08-23 12:00:00+09')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note;
""")

    p2_sql.append(f"""INSERT INTO visit_status_history (id, visit_id, old_status, new_status, client_type, changed_at, changed_by)
VALUES 
('{str(uuid.uuid4())}', '{visit_s8_id}', NULL, '접수', 'desktop', '2026-08-23 12:00:00+09', '{emp_counselor_id}'),
('{str(uuid.uuid4())}', '{visit_s8_id}', '접수', '진행중', 'mobile_offline_sync', '2026-08-23 13:00:00+09', '{emp_field2_id}'),
('{str(uuid.uuid4())}', '{visit_s8_id}', '진행중', '완료', 'mobile_offline_sync', '2026-08-23 14:00:00+09', '{emp_field2_id}')
ON CONFLICT (id) DO NOTHING;
""")

    consult_s9_id = "d9999999-9999-9999-9999-999999999999"
    p2_sql.append("-- 5. S-9: 상담사 수동 교정 상담 (consult_logs & classification_attempts)")
    p2_sql.append(f"""INSERT INTO consult_logs (id, customer_name, symptom, action, keyword, is_completed, is_visit_required, receiver_id, timestamp)
VALUES 
('{consult_s9_id}', '(주)현대메디컬센터', '물이 줄줄 새고 바닥이 흥건해요', 'AI 추천(급수밸브 누수) 기각 후 오수탱크 드레인 호스 파손으로 수동 진단 교정 접수', '오수탱크 하단 드레인 호스 크랙', true, true, '{emp_counselor_id}', '2026-08-23 14:30:00+09')
ON CONFLICT (id) DO UPDATE SET keyword = EXCLUDED.keyword;
""")

    p2_sql.append(f"""INSERT INTO classification_attempts (id, consult_id, input_text, matched_keyword, is_successful, timestamp)
VALUES 
('{str(uuid.uuid4())}', '{consult_s9_id}', '물이 줄줄 새고 바닥이 흥건해요', 'AI추천: 급수 밸브 누수 -> 상담사교정: 오수탱크 하단 드레인 호스 크랙', false, '2026-08-23 14:30:05+09')
ON CONFLICT (id) DO NOTHING;
""")

    visit_s10_past_id = "e1010101-1010-1010-1010-101010101011"
    visit_s10_urgent_id = "e1010101-1010-1010-1010-101010101012"

    p2_sql.append("-- 6. S-10: 14일 전 과거 수리 이력 및 당일 [반복 AS 긴급격상] 출장 건 (visits & history)")
    p2_sql.append(f"""INSERT INTO visits (id, customer_id, customer_name, manager, phone, address, address_detail, request_note, status, note, employee_id, timestamp)
VALUES 
('{visit_s10_past_id}', '{cust_s10_id}', '(주)케이로지스 화성센터', '오센터장', '010-8888-4444', '경기 화성시 남양읍 남양로 300', 'A동 하역장', '흡입 모터 1차 교체 작업', '완료', '신품 흡입 모터 교체 및 진공압 정상 확인 완료', '{emp_field1_id}', '2026-08-09 10:00:00+09'),
('{visit_s10_urgent_id}', '{cust_s10_id}', '(주)케이로지스 화성센터', '오센터장', '010-8888-4444', '경기 화성시 남양읍 남양로 300', 'A동 하역장', '[반복 AS 2회차 - 긴급 정밀점검] 14일 전 모터 교체 이력 감지됨. 1차 셀프조치 생략 및 진공 배관/컨트롤러 전압 긴급 계측 출장', '접수', NULL, '{emp_field1_id}', '2026-08-23 15:00:00+09')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, request_note = EXCLUDED.request_note;
""")

    p2_sql.append(f"""INSERT INTO visit_status_history (id, visit_id, old_status, new_status, client_type, changed_at, changed_by)
VALUES 
('{str(uuid.uuid4())}', '{visit_s10_past_id}', NULL, '접수', 'desktop', '2026-08-09 10:00:00+09', '{emp_counselor_id}'),
('{str(uuid.uuid4())}', '{visit_s10_past_id}', '접수', '진행중', 'mobile', '2026-08-09 13:00:00+09', '{emp_field1_id}'),
('{str(uuid.uuid4())}', '{visit_s10_past_id}', '진행중', '완료', 'mobile', '2026-08-09 15:30:00+09', '{emp_field1_id}'),

('{str(uuid.uuid4())}', '{visit_s10_urgent_id}', NULL, '접수(긴급격상)', 'desktop', '2026-08-23 15:00:00+09', '{emp_counselor_id}')
ON CONFLICT (id) DO NOTHING;
""")

    p2_sql.append("-- 7. 2차 WTT 최소 감사 로그 (audit_log_minimal)")
    p2_sql.append(f"""INSERT INTO audit_log_minimal (id, table_name, record_id, action, changed_by, changed_at)
VALUES 
('{str(uuid.uuid4())}', 'visits', '{visit_s7_id}', 'REVISIT_STOCK', '{emp_field1_id}', '2026-08-23 14:15:00+09'),
('{str(uuid.uuid4())}', 'visits', '{visit_s8_id}', 'OFFLINE_SYNC', '{emp_field2_id}', '2026-08-23 14:00:00+09'),
('{str(uuid.uuid4())}', 'consult_logs', '{consult_s9_id}', 'OVERRIDE', '{emp_counselor_id}', '2026-08-23 14:30:00+09'),
('{str(uuid.uuid4())}', 'visits', '{visit_s10_urgent_id}', 'REPEAT_ESCALATE', '{emp_counselor_id}', '2026-08-23 15:00:00+09')
ON CONFLICT (id) DO NOTHING;
""")
    p2_sql.append("\nCOMMIT;\n")

    p2_path = r"D:\GoogleDrive\RPA_dev\01.AntiGravity\Space_consult_assist\backend\scripts\seed_wtt_mock_data_phase2.sql"
    with open(p2_path, "w", encoding="utf-8") as f:
        f.write("\n".join(p2_sql))
    print(f"Fixed & Saved Phase 2 SQL: {p2_path}")

    # -------------------------------------------------------------
    # 3. Master All (S1-S10) SQL
    # -------------------------------------------------------------
    p1_clean = "\n".join(p1_sql).replace("COMMIT;\n", "")
    p2_clean = "\n".join(p2_sql).replace("BEGIN;\n", "")

    master_content = p1_clean + "\n-- ==========================================\n-- [2차 심화 WTT (S6~S10) 데이터 추가 병합]\n-- ==========================================\n" + p2_clean
    master_path = r"D:\GoogleDrive\RPA_dev\01.AntiGravity\Space_consult_assist\backend\scripts\seed_wtt_master_all.sql"
    with open(master_path, "w", encoding="utf-8") as f:
        f.write(master_content)
    print(f"Fixed & Saved Master All SQL: {master_path}")

if __name__ == "__main__":
    gen_all_sql_seeds()
