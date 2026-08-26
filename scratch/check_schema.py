import psycopg

DATABASE_URL = "postgresql://postgres.eknwzjcbchbefdlykqgl:jUHGAmVsSeXc1jdR@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres"

with psycopg.connect(DATABASE_URL) as conn:
    cur = conn.cursor()
    cur.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'schedule_events'
    """)
    cols = cur.fetchall()
    for c in cols:
        print(f"{c[0]}: {c[1]}")
