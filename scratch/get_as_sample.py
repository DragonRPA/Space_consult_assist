import psycopg
import json

DATABASE_URL = "postgresql://postgres.lkohpffieaanwhohttbu:BKK5s3E1ydVKx6qJ@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

try:
    with psycopg.connect(DATABASE_URL) as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, title, extra FROM space_schedule_events WHERE category = 'as-service' AND extra IS NOT NULL LIMIT 2")
        rows = cur.fetchall()
        for row in rows:
            print("ID:", row[0])
            print("Title:", row[1])
            print(json.dumps(row[2], ensure_ascii=False, indent=2))
            print("-----------------------")
except Exception as e:
    print(e)
