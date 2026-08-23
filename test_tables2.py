import psycopg
url = "postgresql://postgres.eknwzjcbchbefdlykqgl:jUHGAmVsSeXc1jdR@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres"
try:
    with psycopg.connect(url, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")
            cur.execute("CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sr_keyword_gin ON symptom_rules USING GIN(to_tsvector('simple', keyword));")
            cur.execute("CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sr_keyword_trgm ON symptom_rules USING GIN(keyword gin_trgm_ops);")
            print("Successfully re-created GIN indexes.")
except Exception as e:
    print(f"Failed: {e}")
