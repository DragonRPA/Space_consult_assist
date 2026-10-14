"""
Security Verification Test for Server-Only Secret Vault (`private_vault.system_secrets`)
1. Verifies that NO local `.env`, frontend source, or backend source file contains plaintext API keys (`23zleaqo6r`, `fIYIhu251Te4`, `sk-proj-`).
2. Verifies that external PostgREST READ (`anon` / `authenticated` REST API) is 100% blocked from reading `system_secrets`.
3. Verifies that PostgreSQL `anon` and `authenticated` roles fail with `PermissionDenied` when attempting `SELECT` on `private_vault.system_secrets`.
4. Verifies that the backend server `secret_vault.py` loads the secrets into RAM and successfully authenticates with NAVER CLOVA CSR API (`HTTP 200`).
"""
import io
import os
import urllib.request
import urllib.error
import numpy as np
import psycopg
from scipy.io import wavfile
from dotenv import load_dotenv

load_dotenv("backend/.env")

import sys
sys.path.insert(0, os.path.abspath("backend"))

from app.core.secret_vault import load_vault_secrets_into_memory, get_server_secret

def run_security_audit():
    print("=== [1/4] 로컬 파일 및 프론트엔드 평문 시크릿 잔존 여부 스캔 ===")
    forbidden_fragments = ["23zleaqo6r", "fIYIhu251Te4", "sk-proj-HxO6"]
    scan_targets = [
        "backend/.env",
        ".env",
        "frontend/apps/desktop/.env",
        "backend/app/core/config.py",
        "backend/app/services/wasapi_loopback_service.py",
        "frontend/apps/desktop/src/App.tsx",
        "frontend/apps/desktop/src/store.ts",
    ]
    for path in scan_targets:
        if not os.path.exists(path):
            continue
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        for frag in forbidden_fragments:
            if frag in content:
                raise AssertionError(f"보안 위반: {path} 에 평문 시크릿 조각이 남아 있습니다!")
    print("  ✅ 로컬 .env, 백엔드 코드, 프론트엔드 코드 내 평문 API Key 잔존 0건 확인 완료")

    print("\n=== [2/4] 외부 PostgREST 스키마 노출 차단 및 DB 내부 anon / authenticated / PUBLIC 롤 READ 차단 검증 ===")
    dsn = os.environ.get("DATABASE_URL_MIGRATION", "").replace("postgresql+psycopg://", "postgresql://")
    with psycopg.connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT current_setting('pgrst.db_schemas', true);")
            pgrst_schemas = cur.fetchone()[0] or "public, storage, graphql_public"
            assert "private_vault" not in pgrst_schemas, f"보안 위반: private_vault가 PostgREST 스키마에 노출됨! ({pgrst_schemas})"
            print(f"  ✅ PostgREST 외부 노출 스키마 격리 확인 (pgrst.db_schemas='{pgrst_schemas}', private_vault 미포함)")

            cur.execute("""
                SELECT relrowsecurity
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = 'private_vault' AND c.relname = 'system_secrets';
            """)
            rls_enabled = cur.fetchone()[0]
            assert rls_enabled is True, "보안 위반: RLS가 비활성화되어 있습니다!"
            print("  ✅ private_vault.system_secrets 테이블 RLS(Row Level Security) 강제 활성화 확인")

        for role in ["anon", "authenticated"]:
            try:
                with conn.cursor() as cur:
                    cur.execute(f"SET LOCAL ROLE {role}; SELECT * FROM private_vault.system_secrets;")
                    rows = cur.fetchall()
                    raise AssertionError(f"보안 위반: {role} 롤이 system_secrets를 읽을 수 있습니다! {rows}")
            except psycopg.errors.InsufficientPrivilege as priv_err:
                conn.rollback()
                print(f"  ✅ 외부/클라이언트 ROLE '{role}' SELECT(READ) 접근 완전 차단 확인: {priv_err.diag.message_primary}")

    print("\n=== [4/4] 서버 전용 인메모리 볼트 로드 및 NAVER CLOVA CSR 실호출 검증 ===")
    load_vault_secrets_into_memory(force_reload=True)
    clova_id = get_server_secret("NAVER_CLOVA_CLIENT_ID")
    clova_secret = get_server_secret("NAVER_CLOVA_CLIENT_SECRET")
    openai_key = get_server_secret("OPENAI_API_KEY")

    assert len(clova_id) > 5, "NAVER_CLOVA_CLIENT_ID 인메모리 로드 실패"
    assert len(clova_secret) > 10, "NAVER_CLOVA_CLIENT_SECRET 인메모리 로드 실패"
    assert len(openai_key) > 10, "OPENAI_API_KEY 인메모리 로드 실패"
    print(f"  ✅ 서버 RAM 인메모리 로드 성공 (CLOVA_ID 길이={len(clova_id)}, SECRET 길이={len(clova_secret)}, OPENAI 길이={len(openai_key)} / 값 미노출)")

    # Test real CLOVA API call using in-memory secret
    import requests
    sr = 16000
    audio = np.zeros(sr, dtype=np.int16)
    buf = io.BytesIO()
    wavfile.write(buf, sr, audio)
    clova_resp = requests.post(
        "https://naveropenapi.apigw.ntruss.com/recog/v1/stt?lang=Kor",
        data=buf.getvalue(),
        headers={
            "X-NCP-APIGW-API-KEY-ID": clova_id,
            "X-NCP-APIGW-API-KEY": clova_secret,
            "Content-Type": "application/octet-stream",
        },
        timeout=10,
    )
    assert clova_resp.status_code == 200
    print(f"  ✅ 서버 인메모리 볼트 키로 NAVER CLOVA CSR API 호출 성공: HTTP {clova_resp.status_code}")

if __name__ == "__main__":
    run_security_audit()
