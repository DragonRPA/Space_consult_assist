import os
import uuid
import hashlib

def gen_phase2_sql():
    sql = []
    sql.append("-- ==========================================================")
    sql.append("-- Space Advisor 2차 심화 WTT (S6~S10) 모의 데이터 SQL 스크립트")
    sql.append("-- 목적: 고난도 5대 엣지케이스(복합증상, 재고부족 롤백, 오프라인 큐,")
    sql.append("--       상담사 오버라이드, 30일 내 반복고장 긴급승격) 모의 데이터 적재")
    sql.append("-- (FK 제약조건 100% 독립 실행 가능하도록 직원 선행 등록 포함)")
    sql.append("-- ==========================================================\n")
    sql.append("BEGIN;\n")

    # 0. 직원 데이터 (FK 사전 보장)
    emp_counselor_id = "11111111-1111-1111-1111-111111111111"
    emp_field1_id = "22222222-2222-2222-2222-222222222222"
    emp_field2_id = "33333333-3333-3333-3333-333333333333"

    sql.append("-- 0. 직원 데이터 선행 보장 (employees)")
    sql.append(f"""INSERT INTO employees (id, name, phone)
VALUES 
('{emp_counselor_id}', '이지은 상담사', '010-1111-2222'),
('{emp_field1_id}', '김철수 정비기사', '010-3333-4444'),
('{emp_field2_id}', '박영호 정비기사', '010-5555-6666')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone;
""")

    # 1. 신규 고객사 (S-7, S-8, S-9, S-10 전용)
    cust_s7_id = "a7777777-7777-7777-7777-777777777777"
    cust_s8_id = "a8888888-8888-8888-8888-888888888888"
    cust_s9_id = "a9999999-9999-9999-9999-999999999999"
    cust_s10_id = "a1010101-1010-1010-1010-101010101010"

    sql.append("-- 1. 2차 WTT 대상 고객사 데이터 (customers)")
    sql.append(f"""INSERT INTO customers (id, name, manager, manager_phone, address, address_detail)
VALUES 
('{cust_s7_id}', '(주)인천남동정밀', '박공장장', '010-8888-1111', '인천 남동구 남동대로 200', '1공장 프레스룸'),
('{cust_s8_id}', '(주)메가물류센터 지하3층', '임소장', '010-8888-2222', '경기 안성시 일죽면 물류로 50', '지하 3층 저온창고 음영지역'),
('{cust_s9_id}', '(주)현대메디컬센터', '한실장', '010-8888-3333', '서울 서초구 반포대로 150', '별관 3층 수술실 복도'),
('{cust_s10_id}', '(주)케이로지스 화성센터', '오센터장', '010-8888-4444', '경기 화성시 남양읍 남양로 300', 'A동 입출고 하역장')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, manager_phone = EXCLUDED.manager_phone;
""")

    # 2. 특수 부품 (S-7 재고부족 테스트용 희귀부품)
    part_rare_id = "c7777777-7777-7777-7777-777777777777"
    sql.append("-- 2. 희귀 특수 부품 (parts)")
    sql.append(f"""INSERT INTO parts (id, name, compatible_models, unit_price, stock, note, expected_lifespan)
VALUES 
('{part_rare_id}', 'SC-800 전용 메인 통신 제어보드 PCB 24V', 'SC-800', 480000, 1, '본사 해외 직수입 고가 통신보드 (창고 잔여 1개 한정)', '5년')
ON CONFLICT (id) DO UPDATE SET stock = EXCLUDED.stock, unit_price = EXCLUDED.unit_price;
""")

    # 3. S-7: 재고 부족으로 인한 '재방문(REVISIT)' 출장 건
    visit_s7_id = "e7777777-7777-7777-7777-777777777777"
    sql.append("-- 3. S-7: 재고 부족 발생 후 '재방문' 전이 출장 (visits)")
    sql.append(f"""INSERT INTO visits (id, customer_id, customer_name, manager, phone, address, address_detail, request_note, status, note, employee_id, timestamp)
VALUES 
('{visit_s7_id}', '{cust_s7_id}', '(주)인천남동정밀', '박공장장', '010-8888-1111', '인천 남동구 남동대로 200', '1공장 프레스룸', '메인 기판 통신 두절 및 장비 멈춤', '재방문', '특수 제어보드 수량 부족(요청 3개/현재고 1개)으로 본사 긴급 출고 후 익일 10시 재방문 교체 예정', '{emp_field1_id}', '2026-08-23 11:00:00+09')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note;
""")

    sql.append(f"""INSERT INTO visit_status_history (id, visit_id, old_status, new_status, client_type, changed_at, changed_by)
VALUES 
('{str(uuid.uuid4())}', '{visit_s7_id}', NULL, '접수', 'desktop', '2026-08-23 11:00:00+09', '{emp_counselor_id}'),
('{str(uuid.uuid4())}', '{visit_s7_id}', '접수', '진행중', 'mobile', '2026-08-23 13:30:00+09', '{emp_field1_id}'),
('{str(uuid.uuid4())}', '{visit_s7_id}', '진행중', '재방문', 'mobile', '2026-08-23 14:15:00+09', '{emp_field1_id}')
ON CONFLICT (id) DO NOTHING;
""")

    # 4. S-8: 오프라인 모드 PWA 작업 후 온라인 지연 동기화 건
    visit_s8_id = "e8888888-8888-8888-8888-888888888888"
    sql.append("-- 4. S-8: 오프라인 큐 지연 동기화 출장 (visits & visit_status_history)")
    sql.append(f"""INSERT INTO visits (id, customer_id, customer_name, manager, phone, address, address_detail, request_note, status, note, employee_id, timestamp)
VALUES 
('{visit_s8_id}', '{cust_s8_id}', '(주)메가물류센터 지하3층', '임소장', '010-8888-2222', '경기 안성시 일죽면 물류로 50', '지하 3층 저온창고 음영지역', '급수 밸브 닫힘 불량으로 오수 누출', '완료', '지하 통신 음영지역에서 솔레노이드 밸브 교체 완료 후 지상 이동하여 동기화 완료', '{emp_field2_id}', '2026-08-23 12:00:00+09')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note;
""")

    sql.append(f"""INSERT INTO visit_status_history (id, visit_id, old_status, new_status, client_type, changed_at, changed_by)
VALUES 
('{str(uuid.uuid4())}', '{visit_s8_id}', NULL, '접수', 'desktop', '2026-08-23 12:00:00+09', '{emp_counselor_id}'),
('{str(uuid.uuid4())}', '{visit_s8_id}', '접수', '진행중', 'mobile_offline_sync', '2026-08-23 13:00:00+09', '{emp_field2_id}'),
('{str(uuid.uuid4())}', '{visit_s8_id}', '진행중', '완료', 'mobile_offline_sync', '2026-08-23 14:00:00+09', '{emp_field2_id}')
ON CONFLICT (id) DO NOTHING;
""")

    # 5. S-9: 상담사 수동 교정 (Override) 상담 건 및 classification_attempts
    consult_s9_id = "d9999999-9999-9999-9999-999999999999"
    sql.append("-- 5. S-9: 상담사 수동 교정 상담 (consult_logs & classification_attempts)")
    sql.append(f"""INSERT INTO consult_logs (id, customer_name, symptom, action, keyword, is_completed, is_visit_required, receiver_id, timestamp)
VALUES 
('{consult_s9_id}', '(주)현대메디컬센터', '물이 줄줄 새고 바닥이 흥건해요', 'AI 추천(급수밸브 누수) 기각 후 오수탱크 드레인 호스 파손으로 수동 진단 교정 접수', '오수탱크 하단 드레인 호스 크랙', true, true, '{emp_counselor_id}', '2026-08-23 14:30:00+09')
ON CONFLICT (id) DO UPDATE SET keyword = EXCLUDED.keyword;
""")

    sql.append(f"""INSERT INTO classification_attempts (id, consult_id, input_text, matched_keyword, is_successful, timestamp)
VALUES 
('{str(uuid.uuid4())}', '{consult_s9_id}', '물이 줄줄 새고 바닥이 흥건해요', 'AI추천: 급수 밸브 누수 -> 상담사교정: 오수탱크 하단 드레인 호스 크랙', false, '2026-08-23 14:30:05+09')
ON CONFLICT (id) DO NOTHING;
""")

    # 6. S-10: 30일 이내 동일 고장 반복 접수 ➔ 긴급 정밀점검 승격 출장 건
    visit_s10_past_id = "e1010101-1010-1010-1010-101010101011"
    visit_s10_urgent_id = "e1010101-1010-1010-1010-101010101012"

    sql.append("-- 6. S-10: 14일 전 과거 수리 이력 및 당일 [반복 AS 긴급격상] 출장 건 (visits & history)")
    sql.append(f"""INSERT INTO visits (id, customer_id, customer_name, manager, phone, address, address_detail, request_note, status, note, employee_id, timestamp)
VALUES 
-- 14일 전 과거 1차 교체 완료건
('{visit_s10_past_id}', '{cust_s10_id}', '(주)케이로지스 화성센터', '오센터장', '010-8888-4444', '경기 화성시 남양읍 남양로 300', 'A동 하역장', '흡입 모터 1차 교체 작업', '완료', '신품 흡입 모터 교체 및 진공압 정상 확인 완료', '{emp_field1_id}', '2026-08-09 10:00:00+09'),

-- 오늘 재인입된 [반복 AS 2회차 긴급 정밀점검] 접수건
('{visit_s10_urgent_id}', '{cust_s10_id}', '(주)케이로지스 화성센터', '오센터장', '010-8888-4444', '경기 화성시 남양읍 남양로 300', 'A동 하역장', '[반복 AS 2회차 - 긴급 정밀점검] 14일 전 모터 교체 이력 감지됨. 1차 셀프조치 생략 및 진공 배관/컨트롤러 전압 긴급 계측 출장', '접수', NULL, '{emp_field1_id}', '2026-08-23 15:00:00+09')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, request_note = EXCLUDED.request_note;
""")

    sql.append(f"""INSERT INTO visit_status_history (id, visit_id, old_status, new_status, client_type, changed_at, changed_by)
VALUES 
('{str(uuid.uuid4())}', '{visit_s10_past_id}', NULL, '접수', 'desktop', '2026-08-09 10:00:00+09', '{emp_counselor_id}'),
('{str(uuid.uuid4())}', '{visit_s10_past_id}', '접수', '진행중', 'mobile', '2026-08-09 13:00:00+09', '{emp_field1_id}'),
('{str(uuid.uuid4())}', '{visit_s10_past_id}', '진행중', '완료', 'mobile', '2026-08-09 15:30:00+09', '{emp_field1_id}'),

('{str(uuid.uuid4())}', '{visit_s10_urgent_id}', NULL, '접수(긴급격상)', 'desktop', '2026-08-23 15:00:00+09', '{emp_counselor_id}')
ON CONFLICT (id) DO NOTHING;
""")

    # 감사 로그
    sql.append("-- 7. 2차 WTT 최소 감사 로그 (audit_log_minimal)")
    sql.append(f"""INSERT INTO audit_log_minimal (id, table_name, record_id, action, changed_by, changed_at)
VALUES 
('{str(uuid.uuid4())}', 'visits', '{visit_s7_id}', 'REVISIT_STOCK_SHORTAGE', '{emp_field1_id}', '2026-08-23 14:15:00+09'),
('{str(uuid.uuid4())}', 'visits', '{visit_s8_id}', 'OFFLINE_SYNC_COMPLETE', '{emp_field2_id}', '2026-08-23 14:00:00+09'),
('{str(uuid.uuid4())}', 'consult_logs', '{consult_s9_id}', 'COUNSELOR_OVERRIDE', '{emp_counselor_id}', '2026-08-23 14:30:00+09'),
('{str(uuid.uuid4())}', 'visits', '{visit_s10_urgent_id}', 'ESCALATE_REPEAT_BREAKDOWN', '{emp_counselor_id}', '2026-08-23 15:00:00+09')
ON CONFLICT (id) DO NOTHING;
""")

    sql.append("\nCOMMIT;\n")

    out_path = r"D:\GoogleDrive\RPA_dev\01.AntiGravity\Space_consult_assist\backend\scripts\seed_wtt_mock_data_phase2.sql"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(sql))

    print(f"Regenerated 2nd WTT Mock SQL Seed: {out_path}")

def gen_master_all_sql():
    # Merge Phase 1 (S1-S5) and Phase 2 (S6-S10) into a single master SQL file
    p1_path = r"D:\GoogleDrive\RPA_dev\01.AntiGravity\Space_consult_assist\backend\scripts\seed_wtt_mock_data.sql"
    p2_path = r"D:\GoogleDrive\RPA_dev\01.AntiGravity\Space_consult_assist\backend\scripts\seed_wtt_mock_data_phase2.sql"
    
    with open(p1_path, 'r', encoding='utf-8') as f:
        p1_content = f.read().replace("COMMIT;", "")
        
    with open(p2_path, 'r', encoding='utf-8') as f:
        p2_content = f.read().replace("BEGIN;", "")

    master_content = p1_content + "\n-- ==========================================\n-- [2차 심화 WTT (S6~S10) 데이터 추가 병합]\n-- ==========================================\n" + p2_content
    
    master_path = r"D:\GoogleDrive\RPA_dev\01.AntiGravity\Space_consult_assist\backend\scripts\seed_wtt_master_all.sql"
    with open(master_path, "w", encoding="utf-8") as f:
        f.write(master_content)
    print(f"Generated Unified Master Mock SQL Seed: {master_path}")

if __name__ == "__main__":
    gen_phase2_sql()
    gen_master_all_sql()
