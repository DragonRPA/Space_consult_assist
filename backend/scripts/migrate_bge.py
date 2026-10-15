"""
BGE-M3 마이그레이션: nomic(768) → bge-m3(1024)
전제: ollama pull bge-m3 완료
"""
import os, requests, psycopg
from pathlib import Path

for line in Path(r"D:\01.AntiGravity\Space_consult_assist\backend\.env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.startswith("#"):
        k, _, v = line.partition("="); os.environ.setdefault(k.strip(), v.strip())

DB_URL = os.environ["DATABASE_URL_MIGRATION"].replace("postgresql+psycopg://", "postgresql://")

print("=== BGE-M3 마이그레이션 ===")

# 1. bge-m3 사용 가능 확인
models = [m["name"] for m in requests.get("http://localhost:11434/api/tags", timeout=5).json().get("models", [])]
if not any("bge-m3" in m for m in models):
    print("❌ bge-m3 미설치 — ollama pull bge-m3 실행 후 재시도")
    exit(1)
print("✅ bge-m3 확인")

# 2. 차원 확인
resp = requests.post("http://localhost:11434/api/embed", json={"model": "bge-m3", "input": ["테스트"]}, timeout=30)
emb = resp.json()["embeddings"][0]
print(f"✅ bge-m3 차원: {len(emb)}")
if len(emb) != 1024:
    print(f"❌ 예상 1024차원이지만 {len(emb)}차원 반환 — 중단")
    exit(1)

# 3. DB 작업
conn = psycopg.connect(DB_URL)
cur = conn.cursor()

# embedding_nomic 삭제 (768차원)
cur.execute("ALTER TABLE consult_knowledge DROP COLUMN IF EXISTS embedding_nomic")
print("✅ embedding_nomic 컬럼 삭제")

# embedding_bge 추가 (1024차원)
cur.execute("ALTER TABLE consult_knowledge ADD COLUMN IF NOT EXISTS embedding_bge vector(1024)")
print("✅ embedding_bge vector(1024) 컬럼 추가")

# match_similar_bge 함수
cur.execute("""
CREATE OR REPLACE FUNCTION match_similar_bge(
  query_embedding vector(1024),
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
LANGUAGE sql STABLE AS
$fn$
  SELECT id, summary, equipment_model, symptoms,
         parts_mentioned, action_items, urgency,
         1 - (embedding_bge <=> query_embedding) AS similarity
  FROM   consult_knowledge
  WHERE  call_type      = filter_type
    AND  embedding_bge  IS NOT NULL
    AND  is_excluded    = false
  ORDER  BY embedding_bge <=> query_embedding
  LIMIT  match_count;
$fn$
""")
print("✅ match_similar_bge 함수 등록")

# match_similar_calls → bge 별칭 (1024차원)
cur.execute("""
DROP FUNCTION IF EXISTS match_similar_calls(vector(768), int, text);
DROP FUNCTION IF EXISTS match_similar_nomic(vector(768), int, text);
""")
cur.execute("""
CREATE OR REPLACE FUNCTION match_similar_calls(
  query_embedding vector(1024),
  match_count     int  DEFAULT 5,
  filter_type     text DEFAULT '증상수리'
)
RETURNS TABLE (
  id uuid, summary text, equipment_model text,
  symptoms text[], parts_mentioned text[], action_items text[],
  urgency text, similarity float
)
LANGUAGE sql STABLE AS
$fn$
  SELECT * FROM match_similar_bge(query_embedding, match_count, filter_type);
$fn$
""")
print("✅ match_similar_calls 갱신 (bge 별칭, 1024차원)")

conn.commit()
conn.close()

print("")
print("✅ 마이그레이션 완료!")
print("다음: python embed_batch_bge.py 실행")
print("배치 완료 후: HNSW 인덱스 생성 명령")
print("  psql 또는 Supabase SQL에서 실행:")
print("  CREATE INDEX idx_ck_embedding_bge ON consult_knowledge")
print("  USING hnsw (embedding_bge vector_cosine_ops) WITH (m=16, ef_construction=64);")
