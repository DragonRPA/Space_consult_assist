import psycopg

DATABASE_URL = "postgresql://postgres.lkohpffieaanwhohttbu:BKK5s3E1ydVKx6qJ@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

try:
    with psycopg.connect(DATABASE_URL) as conn:
        cur = conn.cursor()
        cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'employees'")
        print("Columns:", cur.fetchall())
        cur.execute("SELECT * FROM space_employees")
        print("Current rows:", cur.fetchall())
except Exception as e:
    print(e)
