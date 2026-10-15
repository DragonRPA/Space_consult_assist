-- ============================================================
-- consult_knowledge 테이블 생성
-- 목적: STT 통화록 분석 결과 KB 저장 + pgvector 확장 대응
-- ============================================================

CREATE TABLE IF NOT EXISTS consult_knowledge (
    id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,

    -- 통화 메타 (파일명 파싱)
    file_name       text NOT NULL UNIQUE,
    call_date       date,
    call_time       time,
    caller_id       text,

    -- 원문
    stt_text        text NOT NULL,

    -- 1차 분류
    call_type       text,   -- 증상수리|일정조율|영업|단순문의|개인통화|판별불가

    -- 2차 상세 (call_type = '증상수리' 일 때 주로 채워짐)
    equipment_model text,
    urgency         text,   -- 긴급|보통|낮음
    symptoms        text[],
    parts_mentioned text[],
    action_items    text[],
    summary         text,

    -- 처리 정보
    analyzed_by     text DEFAULT 'gemma3:12b',
    analyzed_at     timestamptz DEFAULT now(),
    created_at      timestamptz DEFAULT now()

    -- Phase 2 pgvector 전환 시 추가:
    -- embedding   vector(1536)
);

CREATE INDEX IF NOT EXISTS idx_ck_call_type  ON consult_knowledge(call_type);
CREATE INDEX IF NOT EXISTS idx_ck_equipment  ON consult_knowledge(equipment_model);
CREATE INDEX IF NOT EXISTS idx_ck_urgency    ON consult_knowledge(urgency);
CREATE INDEX IF NOT EXISTS idx_ck_call_date  ON consult_knowledge(call_date);
CREATE INDEX IF NOT EXISTS idx_ck_caller     ON consult_knowledge(caller_id);

ALTER TABLE consult_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all" ON consult_knowledge
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all" ON consult_knowledge
    FOR ALL TO service_role USING (true) WITH CHECK (true);
