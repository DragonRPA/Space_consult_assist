import psycopg
DATABASE_URL = "postgresql://postgres.lkohpffieaanwhohttbu:BKK5s3E1ydVKx6qJ@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

sql = """
ALTER TABLE space_transfer_centers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON space_transfer_centers;
CREATE POLICY "Enable read access for all users" ON space_transfer_centers FOR SELECT USING (true);

ALTER TABLE space_employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON space_employees;
CREATE POLICY "Enable read access for all users" ON space_employees FOR SELECT USING (true);
"""

with psycopg.connect(DATABASE_URL) as conn:
    conn.execute(sql)
    conn.commit()
    print("Additional RLS policies updated successfully.")
