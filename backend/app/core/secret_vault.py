"""
Server-Only Secret Vault Manager (`private_vault.system_secrets`)
- 로컬 소스코드, 프론트엔드 번들, 로컬 `.env`에 API Key/Secret을 평문으로 남기지 않고,
  서버 구동 시 원격 DB의 격리된 `private_vault.system_secrets` 테이블에서 인메모리(RAM)로만 로드합니다.
- `private_vault` 스키마는 PostgREST 외부 노출 대상이 아니며, `PUBLIC`, `anon`, `authenticated` 롤의
  READ(SELECT) 권한이 전면 REVOKE 및 RLS `USING (false)`로 이중 차단되어 있습니다.
"""

import logging
import os
import threading
from typing import Dict, Optional

logger = logging.getLogger("space_advisor.secret_vault")

_vault_lock = threading.Lock()
_vault_cache: Dict[str, str] = {}
_vault_loaded: bool = False


def _get_migration_dsn() -> str:
    dsn = os.environ.get("DATABASE_URL_MIGRATION") or os.environ.get("DATABASE_URL") or ""
    dsn = dsn.replace("postgresql+psycopg_async://", "postgresql://")
    dsn = dsn.replace("postgresql+psycopg://", "postgresql://")
    dsn = dsn.replace(":6543/", ":5432/")
    return dsn


def load_vault_secrets_into_memory(force_reload: bool = False) -> Dict[str, str]:
    """
    서버 측 PostgreSQL 마스터 커넥션을 통해 `private_vault.system_secrets`에서
    보안 키를 인메모리 캐시(`_vault_cache`)로 로드합니다.
    절대 로그나 응답으로 평문 값을 출력하지 않습니다.
    """
    global _vault_loaded
    with _vault_lock:
        if _vault_loaded and not force_reload:
            return _vault_cache

        dsn = _get_migration_dsn()
        if not dsn:
            logger.warning("🔒 [SecretVault] DB DSN이 설정되지 않아 원격 볼트 로드를 건너뜁니다.")
            return _vault_cache

        try:
            import psycopg
            with psycopg.connect(dsn, connect_timeout=5) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT secret_key, secret_value FROM private_vault.system_secrets;")
                    rows = cur.fetchall()
                    for k, v in rows:
                        if k and v:
                            _vault_cache[str(k).strip()] = str(v).strip()
            _vault_loaded = True
            logger.info(f"🔐 [SecretVault] 서버 전용 보안 볼트(private_vault)에서 {len(_vault_cache)}개 키 인메모리 로드 완료 (외부 READ 차단됨)")
        except Exception as e:
            logger.warning(f"🔒 [SecretVault] 원격 볼트 로드 실패: {type(e).__name__}")

        return _vault_cache


def get_server_secret(secret_key: str, default: str = "") -> str:
    """
    1순위: 원격 서버 전용 볼트 (`private_vault.system_secrets` 인메모리 캐시)
    2순위: 프로세스 런타임 환경변수 (`os.environ`)
    """
    if not _vault_loaded:
        load_vault_secrets_into_memory()
    val = _vault_cache.get(secret_key)
    if val:
        return val
    return os.environ.get(secret_key, default)
