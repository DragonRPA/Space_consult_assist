-- ============================================================
-- Phase 2-B 완료 후 실행: 엔진별 컬럼 분리 마이그레이션
-- 실행 순서: 1 → 2 → 3 → 4
-- ============================================================

-- 1. embedding 컬럼명 → embedding_nomic 으로 변경
ALTER TABLE consult_knowledge
  RENAME COLUMN embedding TO embedding_nomic;

-- 2. OpenAI용 컬럼 추가 (1536차원)
ALTER TABLE consult_knowledge
  ADD COLUMN IF NOT EXISTS embedding_openai vector(1536);

-- 3. HNSW 인덱스 생성 (nomic)
CREATE INDEX IF NOT EXISTS idx_ck_embedding_nomic
  ON consult_knowledge
  USING hnsw (embedding_nomic vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 4. HNSW 인덱스 생성 (openai) — OpenAI 배치 완료 후 생성 권장
-- CREATE INDEX IF NOT EXISTS idx_ck_embedding_openai
--   ON consult_knowledge
--   USING hnsw (embedding_openai vector_cosine_ops)
--   WITH (m = 16, ef_construction = 64);

-- 5. nomic 검색 함수
CREATE OR REPLACE FUNCTION match_similar_nomic(
  query_embedding vector(768),
  match_count     int  DEFAULT 5,
  filter_type     text DEFAULT '증상수리'
)
RETURNS TABLE (
  id              uuid,
  summary         text,
  equipment_model text,
  symptoms        text[],
  parts_mentioned text[],
  action_items    text[],
  urgency         text,
  similarity      float
)
LANGUAGE sql STABLE AS $$
  SELECT id, summary, equipment_model, symptoms,
         parts_mentioned, action_items, urgency,
         1 - (embedding_nomic <=> query_embedding) AS similarity
  FROM   consult_knowledge
  WHERE  call_type        = filter_type
    AND  embedding_nomic  IS NOT NULL
    AND  is_excluded       = false
  ORDER  BY embedding_nomic <=> query_embedding
  LIMIT  match_count;
$$;

-- 6. OpenAI 검색 함수
CREATE OR REPLACE FUNCTION match_similar_openai(
  query_embedding vector(1536),
  match_count     int  DEFAULT 5,
  filter_type     text DEFAULT '증상수리'
)
RETURNS TABLE (
  id              uuid,
  summary         text,
  equipment_model text,
  symptoms        text[],
  parts_mentioned text[],
  action_items    text[],
  urgency         text,
  similarity      float
)
LANGUAGE sql STABLE AS $$
  SELECT id, summary, equipment_model, symptoms,
         parts_mentioned, action_items, urgency,
         1 - (embedding_openai <=> query_embedding) AS similarity
  FROM   consult_knowledge
  WHERE  call_type         = filter_type
    AND  embedding_openai  IS NOT NULL
    AND  is_excluded        = false
  ORDER  BY embedding_openai <=> query_embedding
  LIMIT  match_count;
$$;

-- 7. 기존 match_similar_calls → nomic 기반으로 유지 (후방 호환)
CREATE OR REPLACE FUNCTION match_similar_calls(
  query_embedding vector(768),
  match_count     int  DEFAULT 5,
  filter_type     text DEFAULT '증상수리'
)
RETURNS TABLE (
  id              uuid,
  summary         text,
  equipment_model text,
  symptoms        text[],
  parts_mentioned text[],
  action_items    text[],
  urgency         text,
  similarity      float
)
LANGUAGE sql STABLE AS $$
  SELECT * FROM match_similar_nomic(query_embedding, match_count, filter_type);
$$;
