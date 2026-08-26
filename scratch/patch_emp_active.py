# -*- coding: utf-8 -*-
import psycopg
import uuid

DATABASE_URL = "postgresql://postgres.eknwzjcbchbefdlykqgl:jUHGAmVsSeXc1jdR@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres"

names = [
    "김성열", "박성현", "조현행", "임아람", "최문정", 
    "고승욱", "임진섭", "차승언", "김종명", "김용철", 
    "guest", "guest2"
]

try:
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            # Add is_active column
            cur.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='employees' AND column_name='is_active'
                ) THEN
                    ALTER TABLE employees ADD COLUMN is_active boolean DEFAULT true;
                END IF;
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='employees' AND column_name='display_order'
                ) THEN
                    ALTER TABLE employees ADD COLUMN display_order integer DEFAULT 999;
                END IF;
            END
            $$;
            """)
            
            # Fetch existing employees
            cur.execute("SELECT id, name FROM employees")
            existing = cur.fetchall()
            
            # We will try to map the new names to existing rows to avoid FK violation.
            # For the ones that exceed, we set is_active = false
            for i, row in enumerate(existing):
                emp_id = row[0]
                if i < len(names):
                    # update name and display_order, active = true
                    cur.execute("UPDATE employees SET name = %s, display_order = %s, is_active = true WHERE id = %s", (names[i], i+1, emp_id))
                else:
                    # deactivate
                    cur.execute("UPDATE employees SET is_active = false, display_order = 999 WHERE id = %s", (emp_id,))
            
            # If there are more names than existing rows, insert them
            if len(names) > len(existing):
                for i in range(len(existing), len(names)):
                    cur.execute("INSERT INTO employees (id, name, display_order, is_active) VALUES (%s, %s, %s, true)", (str(uuid.uuid4()), names[i], i+1))
                    
        conn.commit()
        print("Success: Employees updated seamlessly without dropping FKs.")
except Exception as e:
    print("Error:", e)
