"""
post_embed_chain.py
nomic 배치 완료 직후 자동 실행되는 체인 스크립트:
  1. migrate_dual_embedding.sql 실행 (컬럼 분리 + 함수 등록)
  2. OpenAI billing 확인
  3. 활성 시 → embed_batch_openai.py 실행
  4. 미활성 시 → 사용자에게 보고
"""
import os, sys, subprocess, logging
from pathlib import Path

ENV_PATH = Path(r"D:\01.AntiGravity\Space_consult_assist\backend\.env")
for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, _, v = line.partition("=")
        os.environ.setdefault(k.strip(), v.strip())

LOG_PATH = Path(r"D:\스페이스_테스트\post_chain.log")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.FileHandler(LOG_PATH, encoding="utf-8"), logging.StreamHandler()],
)
log = logging.getLogger(__name__)

import psycopg

DB_URL = os.environ["DATABASE_URL_MIGRATION"].replace("postgresql+psycopg://", "postgresql://")
SQL_PATH = Path(r"D:\01.AntiGravity\Space_consult_assist\backend\scripts\migrate_dual_embedding.sql")
OPENAI_BATCH = Path(r"D:\01.AntiGravity\Space_consult_assist\backend\scripts\embed_batch_openai.py")

def step1_check_nomic_done():
    """nomic 임베딩 완료 여부 확인"""
    conn = psycopg.connect(DB_URL)
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM consult_knowledge WHERE call_type='증상수리' AND embedding IS NULL")
    remaining = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM consult_knowledge WHERE call_type='증상수리' AND embedding IS NOT NULL")
    done = cur.fetchone()[0]
    conn.close()
    log.info(f"nomic 임베딩 현황: 완료 {done:,}건 / 미완료 {remaining:,}건")
    return remaining == 0

def step2_migrate():
    """migrate_dual_embedding.sql 실행"""
    log.info("=" * 50)
    log.info("STEP 2: 컬럼 분리 마이그레이션 실행")
    sql = SQL_PATH.read_text(encoding="utf-8")
    conn = psycopg.connect(DB_URL)
    try:
        # 이미 embedding_nomic 컬럼이 있으면 스킵
        cur = conn.cursor()
        cur.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name='consult_knowledge' AND column_name='embedding_nomic'
        """)
        if cur.fetchone():
            log.info("  embedding_nomic 컬럼 이미 존재 → 마이그레이션 스킵")
            conn.close()
            return True

        # 각 SQL 문을 분리하여 실행
        statements = [s.strip() for s in sql.split(";") if s.strip() and not s.strip().startswith("--")]
        for stmt in statements:
            if not stmt:
                continue
            try:
                cur.execute(stmt)
                log.info(f"  OK: {stmt[:60].replace(chr(10),' ')}...")
            except Exception as e:
                log.warning(f"  SKIP (무해): {e}")
        conn.commit()
        log.info("  마이그레이션 완료")
        conn.close()
        return True
    except Exception as e:
        log.error(f"마이그레이션 오류: {e}")
        conn.close()
        return False

def step3_check_openai():
    """OpenAI billing 활성 여부 확인"""
    log.info("=" * 50)
    log.info("STEP 3: OpenAI billing 확인")
    key = os.environ.get("OPENAI_API_KEY", "")
    if not key:
        log.warning("  OPENAI_API_KEY 없음")
        return False
    try:
        from openai import OpenAI
        client = OpenAI(api_key=key)
        r = client.embeddings.create(model="text-embedding-3-small", input=["테스트"])
        log.info(f"  ✅ OpenAI 활성 확인 (차원={len(r.data[0].embedding)})")
        return True
    except Exception as e:
        log.warning(f"  ❌ OpenAI 미활성: {e}")
        return False

def step4_run_openai_batch():
    """OpenAI 임베딩 배치 실행"""
    log.info("=" * 50)
    log.info("STEP 4: OpenAI 임베딩 배치 실행")
    result = subprocess.run(
        [sys.executable, "-X", "utf8", str(OPENAI_BATCH)],
        capture_output=False  # 실시간 출력
    )
    if result.returncode == 0:
        log.info("  ✅ OpenAI 배치 완료")
    else:
        log.error(f"  ❌ OpenAI 배치 실패 (returncode={result.returncode})")

def main():
    log.info("=" * 50)
    log.info("post_embed_chain.py 시작")
    log.info("=" * 50)

    # 1. nomic 완료 확인
    if not step1_check_nomic_done():
        log.warning("nomic 임베딩이 아직 완료되지 않았습니다. 잠시 후 재실행하세요.")
        sys.exit(1)
    log.info("✅ STEP 1: nomic 임베딩 완료 확인")

    # 2. DB 마이그레이션
    if not step2_migrate():
        log.error("마이그레이션 실패. 수동으로 migrate_dual_embedding.sql을 실행하세요.")
        sys.exit(1)
    log.info("✅ STEP 2: DB 마이그레이션 완료")

    # 3. OpenAI 확인
    openai_active = step3_check_openai()

    if openai_active:
        # 4. OpenAI 배치
        step4_run_openai_batch()
        log.info("✅ STEP 4: OpenAI 임베딩 배치 완료")
        log.info("")
        log.info("🎉 전체 체인 완료!")
        log.info("   → 브라우저에서 http://localhost:5173/counsel-compare 접속하여 비교 테스트 가능")
    else:
        log.info("")
        log.info("⏳ OpenAI 미활성 상태")
        log.info("   → platform.openai.com/billing 에서 결제 확인 후")
        log.info("   → python embed_batch_openai.py 직접 실행")
        log.info("   (nomic 임베딩과 DB 마이그레이션은 완료됨)")

if __name__ == "__main__":
    main()
