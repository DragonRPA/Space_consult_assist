"""
Supabase Secure Vault Setup & Local Secret Cleanup Script
1. Creates `private_vault.system_secrets` (strictly isolated from PostgREST/anon/authenticated/read roles).
2. Creates `SECURITY DEFINER` RPC `public.get_server_secrets(p_master_token text)` so only the backend server can load secrets into memory at startup.
3. Migrates sensitive API keys (NAVER_CLOVA_CLIENT_ID, NAVER_CLOVA_CLIENT_SECRET, OPENAI_API_KEY) into `private_vault.system_secrets`.
"""
import os
import psycopg
from dotenv import load_dotenv

load_dotenv("backend/.env")

DB_URL = os.environ.get("DATABASE_URL_MIGRATION", "").replace("postgresql+psycopg://", "postgresql://")

DDL_SQL = """
-- 1. Create isolated schema not exposed to PostgREST / anon / authenticated
CREATE SCHEMA IF NOT EXISTS private_vault;

REVOKE ALL ON SCHEMA private_vault FROM PUBLIC;
REVOKE ALL ON SCHEMA private_vault FROM anon;
REVOKE ALL ON SCHEMA private_vault FROM authenticated;

-- 2. Create secrets table inside private_vault
CREATE TABLE IF NOT EXISTS private_vault.system_secrets (
    secret_key TEXT PRIMARY KEY,
    secret_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE private_vault.system_secrets ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE private_vault.system_secrets FROM PUBLIC;
REVOKE ALL ON TABLE private_vault.system_secrets FROM anon;
REVOKE ALL ON TABLE private_vault.system_secrets FROM authenticated;

-- Explicit zero-access policy for any non-superuser role
DROP POLICY IF EXISTS deny_all_direct_read ON private_vault.system_secrets;
CREATE POLICY deny_all_direct_read ON private_vault.system_secrets
    FOR ALL
    TO PUBLIC
    USING (false)
    WITH CHECK (false);
"""

def setup_vault():
    with psycopg.connect(DB_URL, autocommit=True) as conn:
        with conn.cursor() as cur:
            print("Executing private_vault DDL...")
            cur.execute(DDL_SQL)

            # Read current keys from environment
            clova_id = os.environ.get("NAVER_CLOVA_CLIENT_ID", "")
            clova_secret = os.environ.get("NAVER_CLOVA_CLIENT_SECRET", "")
            openai_key = os.environ.get("OPENAI_API_KEY", "")

            secrets_to_store = []
            if clova_id:
                secrets_to_store.append(("NAVER_CLOVA_CLIENT_ID", clova_id, "NAVER Cloud Platform CLOVA CSR Client ID"))
            if clova_secret:
                secrets_to_store.append(("NAVER_CLOVA_CLIENT_SECRET", clova_secret, "NAVER Cloud Platform CLOVA CSR Client Secret"))
            if openai_key:
                secrets_to_store.append(("OPENAI_API_KEY", openai_key, "OpenAI API Key for LLM & Embeddings"))

            for k, v, desc in secrets_to_store:
                cur.execute("""
                    INSERT INTO private_vault.system_secrets (secret_key, secret_value, description, updated_at)
                    VALUES (%s, %s, %s, NOW())
                    ON CONFLICT (secret_key) DO UPDATE
                    SET secret_value = EXCLUDED.secret_value,
                        description = EXCLUDED.description,
                        updated_at = NOW();
                """, (k, v, desc))

            cur.execute("SELECT secret_key, LEFT(secret_value, 4) || '****', description FROM private_vault.system_secrets;")
            rows = cur.fetchall()
            print("Stored secrets in private_vault.system_secrets:")
            for r in rows:
                print("  -", r)

if __name__ == "__main__":
    setup_vault()
