# -*- coding: utf-8 -*-
import psycopg
import uuid

DATABASE_URL = "postgresql://postgres.eknwzjcbchbefdlykqgl:jUHGAmVsSeXc1jdR@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres"

names = [
    "김성열",
    "박성현",
    "조현행",
    "임아람",
    "최문정",
    "고승욱",
    "임진섭",
    "차승언",
    "김종명",
    "김용철",
    "guest",
    "guest2"
]

try:
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            # 1. Add column if not exists
            cur.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='employees' AND column_name='display_order'
                ) THEN
                    ALTER TABLE employees ADD COLUMN display_order integer DEFAULT 999;
                END IF;
            END
            $$;
            """)
            
            # 2. Delete all rows
            cur.execute("DELETE FROM employees")
            
            # 3. Insert real rows
            for idx, name in enumerate(names, 1):
                cur.execute(
                    "INSERT INTO employees (id, name, display_order) VALUES (%s, %s, %s)",
                    (str(uuid.uuid4()), name, idx)
                )
        conn.commit()
        print("Success: DB patched and data inserted.")
except Exception as e:
    print("Error:", e)
