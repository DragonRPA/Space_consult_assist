import psycopg
DATABASE_URL = "postgresql://postgres.eknwzjcbchbefdlykqgl:jUHGAmVsSeXc1jdR@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres"

sql = """
ALTER TABLE schedule_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON schedule_events;
DROP POLICY IF EXISTS "Enable insert for all users" ON schedule_events;
DROP POLICY IF EXISTS "Enable update for all users" ON schedule_events;
DROP POLICY IF EXISTS "Enable delete for all users" ON schedule_events;

CREATE POLICY "Enable read access for all users" ON schedule_events FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON schedule_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON schedule_events FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for all users" ON schedule_events FOR DELETE USING (true);
"""

with psycopg.connect(DATABASE_URL) as conn:
    conn.execute(sql)
    conn.commit()
    print("RLS policies updated successfully.")
