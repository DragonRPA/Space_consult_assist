-- ==========================================================
-- Space Advisor 2차 심화 WTT (S6~S10) 모의 데이터 SQL 스크립트
-- ==========================================================

BEGIN;

-- 0. 직원 데이터 선행 보장 (employees)
INSERT INTO employees (id, name, phone)
VALUES 
('11111111-1111-1111-1111-111111111111', '이지은 상담사', '010-1111-2222'),
('22222222-2222-2222-2222-222222222222', '김철수 정비기사', '010-3333-4444'),
('33333333-3333-3333-3333-333333333333', '박영호 정비기사', '010-5555-6666')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone;

-- 1. 2차 WTT 대상 고객사 데이터 (customers)
INSERT INTO customers (id, name, manager, manager_phone, address, address_detail)
VALUES 
('a7777777-7777-7777-7777-777777777777', '(주)인천남동정밀', '박공장장', '010-8888-1111', '인천 남동구 남동대로 200', '1공장 프레스룸'),
('a8888888-8888-8888-8888-888888888888', '(주)메가물류센터 지하3층', '임소장', '010-8888-2222', '경기 안성시 일죽면 물류로 50', '지하 3층 저온창고 음영지역'),
('a9999999-9999-9999-9999-999999999999', '(주)현대메디컬센터', '한실장', '010-8888-3333', '서울 서초구 반포대로 150', '별관 3층 수술실 복도'),
('a1010101-1010-1010-1010-101010101010', '(주)케이로지스 화성센터', '오센터장', '010-8888-4444', '경기 화성시 남양읍 남양로 300', 'A동 입출고 하역장')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, manager_phone = EXCLUDED.manager_phone;

-- 2. 희귀 특수 부품 (parts)
INSERT INTO parts (id, name, compatible_models, unit_price, stock, note, expected_lifespan)
VALUES 
('c7777777-7777-7777-7777-777777777777', 'SC-800 전용 메인 통신 제어보드 PCB 24V', 'SC-800', 480000, 1, '본사 해외 직수입 고가 통신보드 (창고 잔여 1개 한정)', '5년')
ON CONFLICT (id) DO UPDATE SET stock = EXCLUDED.stock, unit_price = EXCLUDED.unit_price;

-- 3. S-7: 재고 부족 발생 후 '재방문' 전이 출장 (visits)
INSERT INTO visits (id, customer_id, customer_name, manager, phone, address, address_detail, request_note, status, note, employee_id, timestamp)
VALUES 
('e7777777-7777-7777-7777-777777777777', 'a7777777-7777-7777-7777-777777777777', '(주)인천남동정밀', '박공장장', '010-8888-1111', '인천 남동구 남동대로 200', '1공장 프레스룸', '메인 기판 통신 두절 및 장비 멈춤', '재방문', '특수 제어보드 수량 부족(요청 3개/현재고 1개)으로 본사 긴급 출고 후 익일 10시 재방문 교체 예정', '22222222-2222-2222-2222-222222222222', '2026-08-23 11:00:00+09')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note;

INSERT INTO visit_status_history (id, visit_id, old_status, new_status, client_type, changed_at, changed_by)
VALUES 
('85d1c86f-7052-45ad-a3ba-5e557542a29e', 'e7777777-7777-7777-7777-777777777777', NULL, '접수', 'desktop', '2026-08-23 11:00:00+09', '11111111-1111-1111-1111-111111111111'),
('45d992f6-6917-4015-8d20-5cf3c0407377', 'e7777777-7777-7777-7777-777777777777', '접수', '진행중', 'mobile', '2026-08-23 13:30:00+09', '22222222-2222-2222-2222-222222222222'),
('981d5777-7efd-4a4f-8709-9c932248e787', 'e7777777-7777-7777-7777-777777777777', '진행중', '재방문', 'mobile', '2026-08-23 14:15:00+09', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO NOTHING;

-- 4. S-8: 오프라인 큐 지연 동기화 출장 (visits & visit_status_history)
INSERT INTO visits (id, customer_id, customer_name, manager, phone, address, address_detail, request_note, status, note, employee_id, timestamp)
VALUES 
('e8888888-8888-8888-8888-888888888888', 'a8888888-8888-8888-8888-888888888888', '(주)메가물류센터 지하3층', '임소장', '010-8888-2222', '경기 안성시 일죽면 물류로 50', '지하 3층 저온창고 음영지역', '급수 밸브 닫힘 불량으로 오수 누출', '완료', '지하 통신 음영지역에서 솔레노이드 밸브 교체 완료 후 지상 이동하여 동기화 완료', '33333333-3333-3333-3333-333333333333', '2026-08-23 12:00:00+09')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note;

INSERT INTO visit_status_history (id, visit_id, old_status, new_status, client_type, changed_at, changed_by)
VALUES 
('7b24f407-3f9e-4cf4-80a3-50856d683a9a', 'e8888888-8888-8888-8888-888888888888', NULL, '접수', 'desktop', '2026-08-23 12:00:00+09', '11111111-1111-1111-1111-111111111111'),
('83f7bced-3c21-405c-9e64-819a9020e8c5', 'e8888888-8888-8888-8888-888888888888', '접수', '진행중', 'mobile_offline_sync', '2026-08-23 13:00:00+09', '33333333-3333-3333-3333-333333333333'),
('58c76f61-3886-4fe5-b47f-cb2c4d60d245', 'e8888888-8888-8888-8888-888888888888', '진행중', '완료', 'mobile_offline_sync', '2026-08-23 14:00:00+09', '33333333-3333-3333-3333-333333333333')
ON CONFLICT (id) DO NOTHING;

-- 5. S-9: 상담사 수동 교정 상담 (consult_logs & classification_attempts)
INSERT INTO consult_logs (id, customer_name, symptom, action, keyword, is_completed, is_visit_required, receiver_id, timestamp)
VALUES 
('d9999999-9999-9999-9999-999999999999', '(주)현대메디컬센터', '물이 줄줄 새고 바닥이 흥건해요', 'AI 추천(급수밸브 누수) 기각 후 오수탱크 드레인 호스 파손으로 수동 진단 교정 접수', '오수탱크 하단 드레인 호스 크랙', true, true, '11111111-1111-1111-1111-111111111111', '2026-08-23 14:30:00+09')
ON CONFLICT (id) DO UPDATE SET keyword = EXCLUDED.keyword;

INSERT INTO classification_attempts (id, consult_id, input_text, matched_keyword, is_successful, timestamp)
VALUES 
('6edccb6e-febf-41fe-9be8-63324b6c0eff', 'd9999999-9999-9999-9999-999999999999', '물이 줄줄 새고 바닥이 흥건해요', 'AI추천: 급수 밸브 누수 -> 상담사교정: 오수탱크 하단 드레인 호스 크랙', false, '2026-08-23 14:30:05+09')
ON CONFLICT (id) DO NOTHING;

-- 6. S-10: 14일 전 과거 수리 이력 및 당일 [반복 AS 긴급격상] 출장 건 (visits & history)
INSERT INTO visits (id, customer_id, customer_name, manager, phone, address, address_detail, request_note, status, note, employee_id, timestamp)
VALUES 
('e1010101-1010-1010-1010-101010101011', 'a1010101-1010-1010-1010-101010101010', '(주)케이로지스 화성센터', '오센터장', '010-8888-4444', '경기 화성시 남양읍 남양로 300', 'A동 하역장', '흡입 모터 1차 교체 작업', '완료', '신품 흡입 모터 교체 및 진공압 정상 확인 완료', '22222222-2222-2222-2222-222222222222', '2026-08-09 10:00:00+09'),
('e1010101-1010-1010-1010-101010101012', 'a1010101-1010-1010-1010-101010101010', '(주)케이로지스 화성센터', '오센터장', '010-8888-4444', '경기 화성시 남양읍 남양로 300', 'A동 하역장', '[반복 AS 2회차 - 긴급 정밀점검] 14일 전 모터 교체 이력 감지됨. 1차 셀프조치 생략 및 진공 배관/컨트롤러 전압 긴급 계측 출장', '접수', NULL, '22222222-2222-2222-2222-222222222222', '2026-08-23 15:00:00+09')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, request_note = EXCLUDED.request_note;

INSERT INTO visit_status_history (id, visit_id, old_status, new_status, client_type, changed_at, changed_by)
VALUES 
('62be0185-d479-4653-aa08-a7bd86c2e046', 'e1010101-1010-1010-1010-101010101011', NULL, '접수', 'desktop', '2026-08-09 10:00:00+09', '11111111-1111-1111-1111-111111111111'),
('3494782f-5373-4e43-8795-c76200b5b6f6', 'e1010101-1010-1010-1010-101010101011', '접수', '진행중', 'mobile', '2026-08-09 13:00:00+09', '22222222-2222-2222-2222-222222222222'),
('4ac814ad-8255-4b31-a349-8888ac300cdd', 'e1010101-1010-1010-1010-101010101011', '진행중', '완료', 'mobile', '2026-08-09 15:30:00+09', '22222222-2222-2222-2222-222222222222'),

('3be43756-d8c4-456f-9acc-74e22c9bcfb3', 'e1010101-1010-1010-1010-101010101012', NULL, '접수(긴급격상)', 'desktop', '2026-08-23 15:00:00+09', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- 7. 2차 WTT 최소 감사 로그 (audit_log_minimal)
INSERT INTO audit_log_minimal (id, table_name, record_id, action, changed_by, changed_at)
VALUES 
('d3dd07e3-b035-4e59-879b-0916eaaa1bde', 'visits', 'e7777777-7777-7777-7777-777777777777', 'REVISIT_STOCK', '22222222-2222-2222-2222-222222222222', '2026-08-23 14:15:00+09'),
('dccc8874-0d0a-4ee8-a329-9a07df783a12', 'visits', 'e8888888-8888-8888-8888-888888888888', 'OFFLINE_SYNC', '33333333-3333-3333-3333-333333333333', '2026-08-23 14:00:00+09'),
('69ed07e4-6b0c-4f98-97d7-bd765f313709', 'consult_logs', 'd9999999-9999-9999-9999-999999999999', 'OVERRIDE', '11111111-1111-1111-1111-111111111111', '2026-08-23 14:30:00+09'),
('b78a8a79-8afe-4a28-9edf-22a5b37e997e', 'visits', 'e1010101-1010-1010-1010-101010101012', 'REPEAT_ESCALATE', '11111111-1111-1111-1111-111111111111', '2026-08-23 15:00:00+09')
ON CONFLICT (id) DO NOTHING;


COMMIT;
