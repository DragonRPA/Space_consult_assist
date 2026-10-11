import psycopg

conn_str = 'postgresql://postgres.eknwzjcbchbefdlykqgl:jUHGAmVsSeXc1jdR@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres'

sql_statements = [
    # 1. Bucket
    """
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('symptom-guide-photos', 'symptom-guide-photos', true)
    ON CONFLICT (id) DO NOTHING;
    """,

    # 2. Table
    """
    CREATE TABLE IF NOT EXISTS public.symptom_guide_photos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        equipment_model VARCHAR(50) NOT NULL,
        symptom_id VARCHAR(100) NOT NULL,
        step_no INTEGER NOT NULL DEFAULT 1,
        order_no INTEGER NOT NULL DEFAULT 1,
        photo_url TEXT NOT NULL,
        caption TEXT NOT NULL DEFAULT '',
        file_size_bytes INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
    );
    """,

    # 3. Table RLS
    "ALTER TABLE public.symptom_guide_photos ENABLE ROW LEVEL SECURITY;",
    "DROP POLICY IF EXISTS \"Allow public read symptom_guide_photos\" ON public.symptom_guide_photos;",
    "CREATE POLICY \"Allow public read symptom_guide_photos\" ON public.symptom_guide_photos FOR SELECT TO anon, authenticated USING (true);",
    "DROP POLICY IF EXISTS \"Allow public all symptom_guide_photos\" ON public.symptom_guide_photos;",
    "CREATE POLICY \"Allow public all symptom_guide_photos\" ON public.symptom_guide_photos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);",

    # 4. Storage Policies
    "DROP POLICY IF EXISTS \"Public Access symptom-guide-photos\" ON storage.objects;",
    "CREATE POLICY \"Public Access symptom-guide-photos\" ON storage.objects FOR SELECT TO public USING (bucket_id = 'symptom-guide-photos');",
    "DROP POLICY IF EXISTS \"Public Upload symptom-guide-photos\" ON storage.objects;",
    "CREATE POLICY \"Public Upload symptom-guide-photos\" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'symptom-guide-photos');",
    "DROP POLICY IF EXISTS \"Public Delete symptom-guide-photos\" ON storage.objects;",
    "CREATE POLICY \"Public Delete symptom-guide-photos\" ON storage.objects FOR DELETE TO public USING (bucket_id = 'symptom-guide-photos');"
]

def main():
    print("Connecting to Supabase PostgreSQL...")
    with psycopg.connect(conn_str, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            for stmt in sql_statements:
                stmt_clean = stmt.strip()
                if stmt_clean:
                    cur.execute(stmt_clean)
        conn.commit()
    print("🎉 Supabase Storage bucket 'symptom-guide-photos' & table 'symptom_guide_photos' created successfully!")

if __name__ == '__main__':
    main()
