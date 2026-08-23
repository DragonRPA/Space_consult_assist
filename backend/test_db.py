import os
import psycopg
import time
from dotenv import load_dotenv

load_dotenv()
url = os.getenv("DATABASE_URL")
if not url:
    url = "postgresql://postgres:postgres@localhost:5432/postgres"

for i in range(5):
    try:
        print(f"Attempt {i+1}...")
        with psycopg.connect(url) as conn:
            print("Connected successfully!")
            break
    except Exception as e:
        print(f"Failed: {e}")
        time.sleep(5)
