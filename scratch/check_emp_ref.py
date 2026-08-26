import psycopg

DATABASE_URL = "postgresql://postgres.eknwzjcbchbefdlykqgl:jUHGAmVsSeXc1jdR@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres"

try:
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            # Add active column if not exists
            cur.execute("""
            DO \
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='employees' AND column_name='is_active'
                ) THEN
                    ALTER TABLE employees ADD COLUMN is_active boolean DEFAULT true;
                END IF;
            END
            \;
            """)
            conn.commit()
            print("is_active column added.")
except Exception as e:
    print(e)
