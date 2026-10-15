"""
consult_knowledge 테이블의 embedding_bge 컬럼에 HNSW 인덱스 생성
"""
import os
import sys
import time
import psycopg
from dotenv import load_dotenv

load_dotenv("backend/.env")

DB_URL = os.environ.get("DATABASE_URL_MIGRATION", "").replace("postgresql+psycopg://", "postgresql://")
if not DB_URL:
    print("[ERROR] DATABASE_URL_MIGRATION not found in backend/.env")
    sys.exit(1)

def create_index():
    print(f"[INFO] DB 연결: {DB_URL[:30]}...")
    with psycopg.connect(DB_URL, autocommit=True) as conn:
        with conn.cursor() as cur:
            print("[INFO] HNSW 인덱스 생성 시작 (idx_ck_embedding_bge)...")
            t0 = time.time()
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_ck_embedding_bge 
                ON consult_knowledge 
                USING hnsw (embedding_bge vector_cosine_ops) 
                WITH (m = 16, ef_construction = 64);
            """)
            dur = time.time() - t0
            print(f"[SUCCESS] HNSW 인덱스 생성 완료! 소요 시간: {dur:.2f}초")

            cur.execute("""
                SELECT indexname, indexdef 
                FROM pg_indexes 
                WHERE tablename = 'consult_knowledge' AND indexname LIKE '%bge%';
            """)
            rows = cur.fetchall()
            for r in rows:
                print(f"[INDEX] {r[0]}: {r[1]}")

if __name__ == "__main__":
    create_index()
