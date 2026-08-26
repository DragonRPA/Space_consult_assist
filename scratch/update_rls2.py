import psycopg
DATABASE_URL = "postgresql://postgres.eknwzjcbchbefdlykqgl:jUHGAmVsSeXc1jdR@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres"

sql = """
ALTER TABLE transfer_centers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON transfer_centers;
CREATE POLICY "Enable read access for all users" ON transfer_centers FOR SELECT USING (true);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON employees;
CREATE POLICY "Enable read access for all users" ON employees FOR SELECT USING (true);
"""

with psycopg.connect(DATABASE_URL) as conn:
    conn.execute(sql)
    conn.commit()
    print("Additional RLS policies updated successfully.")
