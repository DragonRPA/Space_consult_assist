import psycopg
import time

url = "postgresql://postgres.eknwzjcbchbefdlykqgl:jUHGAmVsSeXc1jdR@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres"

for i in range(5):
    try:
        print(f"Attempt {i+1}...")
        with psycopg.connect(url) as conn:
            print("Connected successfully!")
            break
    except Exception as e:
        print(f"Failed: {e}")
        time.sleep(5)
