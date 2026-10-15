"""
Phase 2-C: OpenAI text-embedding-3-small 임베딩 배치
- 대상: call_type='증상수리' AND embedding_openai IS NULL
- 모델: text-embedding-3-small (1536차원)
- 전제조건: migrate_dual_embedding.sql 실행 완료 후 사용
- 재실행: embedding_openai IS NULL 조건으로 자동 이어받기
"""

import os, sys, json, time, logging
from pathlib import Path

ENV_PATH = Path(r"D:\01.AntiGravity\Space_consult_assist\backend\.env")
for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, _, v = line.partition("=")
        os.environ.setdefault(k.strip(), v.strip())

OPENAI_API_KEY  = os.environ.get("OPENAI_API_KEY", "")
DB_URL          = os.environ["DATABASE_URL_MIGRATION"].replace("postgresql+psycopg://", "postgresql://")
EMBED_MODEL     = "text-embedding-3-small"
BATCH_SIZE      = 100
CHECKPOINT_PATH = Path(r"D:\스페이스_테스트\embed_openai_checkpoint.json")
LOG_PATH        = Path(r"D:\스페이스_테스트\embed_openai_run.log")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s.%(msecs)03d [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.FileHandler(LOG_PATH, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ]
)
log = logging.getLogger(__name__)

try:
    import psycopg
    from openai import OpenAI
except ImportError as e:
    log.error(f"필수 패키지 없음: {e} — pip install openai psycopg")
    sys.exit(1)

if not OPENAI_API_KEY:
    log.error("OPENAI_API_KEY가 .env에 없습니다.")
    sys.exit(1)

client = OpenAI(api_key=OPENAI_API_KEY)

def generate_embeddings(texts: list) -> list:
    response = client.embeddings.create(
        model=EMBED_MODEL,
        input=texts,
        encoding_format="float"
    )
    return [item.embedding for item in response.data]

def build_text(row: dict) -> str:
    parts = []
    if row["equipment_model"] and row["equipment_model"] != "null":
        parts.append(f"[{row['equipment_model']}]")
    if row["summary"]:
        parts.append(row["summary"])
    symptoms = [s for s in (row["symptoms"] or []) if s]
    if symptoms:
        parts.append("증상: " + ", ".join(symptoms))
    parts_list = [p for p in (row["parts_mentioned"] or []) if p]
    if parts_list:
        parts.append("부품: " + ", ".join(parts_list))
    result = " ".join(parts)
    return result if result.strip() else "증상 정보 없음"

def load_cp() -> dict:
    if CHECKPOINT_PATH.exists():
        return json.loads(CHECKPOINT_PATH.read_text(encoding="utf-8"))
    return {"processed": 0, "total_tokens": 0, "errors": 0}

def save_cp(cp: dict):
    CHECKPOINT_PATH.write_text(json.dumps(cp, ensure_ascii=False, indent=2), encoding="utf-8")

def main():
    log.info("=" * 60)
    log.info(f"Phase 2-C: OpenAI 임베딩 배치 | 모델: {EMBED_MODEL}")
    log.info("=" * 60)

    cp = load_cp()
    conn = psycopg.connect(DB_URL)
    cur = conn.cursor()

    # 전제조건 확인: embedding_openai 컬럼 존재 여부
    cur.execute("""
        SELECT column_name FROM information_schema.columns
        WHERE table_name='consult_knowledge' AND column_name='embedding_openai'
    """)
    if not cur.fetchone():
        log.error("embedding_openai 컬럼이 없습니다.")
        log.error("먼저 migrate_dual_embedding.sql 을 실행하세요.")
        conn.close()
        sys.exit(1)

    cur.execute("SELECT COUNT(*) FROM consult_knowledge WHERE call_type='증상수리' AND embedding_openai IS NULL")
    total = cur.fetchone()[0]
    log.info(f"임베딩 대상: {total:,}건")

    if total == 0:
        log.info("모든 레코드 OpenAI 임베딩 완료 상태.")
        conn.close()
        return

    est_tokens = total * 80
    est_cost_usd = est_tokens / 1_000_000 * 0.020
    log.info(f"예상 비용: ~${est_cost_usd:.4f} (₩{est_cost_usd*1380:.0f})")

    processed = 0
    total_tokens = cp["total_tokens"]
    errors = cp["errors"]
    t_start = time.time()

    while True:
        cur.execute("""
            SELECT id, summary, symptoms, parts_mentioned, equipment_model
            FROM consult_knowledge
            WHERE call_type = '증상수리' AND embedding_openai IS NULL
            ORDER BY created_at
            LIMIT %s
        """, (BATCH_SIZE,))
        rows = cur.fetchall()
        if not rows:
            break

        cols = ["id", "summary", "symptoms", "parts_mentioned", "equipment_model"]
        records = [dict(zip(cols, r)) for r in rows]
        texts = [build_text(r) for r in records]

        try:
            t0 = time.time()
            embeddings = generate_embeddings(texts)
            elapsed = time.time() - t0

            for rec, emb in zip(records, embeddings):
                vec_str = "[" + ",".join(f"{v:.8f}" for v in emb) + "]"
                cur.execute(
                    "UPDATE consult_knowledge SET embedding_openai = %s::vector WHERE id = %s",
                    (vec_str, rec["id"])
                )
            conn.commit()

            batch_tokens = sum(len(t.split()) * 1.3 for t in texts)
            total_tokens += int(batch_tokens)
            processed += len(records)

            elapsed_total = time.time() - t_start
            speed = processed / elapsed_total if elapsed_total > 0 else 1
            remaining = total - processed
            eta_sec = int(remaining / speed) if speed > 0 else 0

            log.info(
                f"[{processed:5d}/{total:5d}] {len(records)}건 | "
                f"API {elapsed:.1f}초 | ~{total_tokens//1000}K 토큰 | "
                f"ETA {eta_sec//60}분"
            )

            cp.update({"processed": cp.get("processed",0)+len(records), "total_tokens": total_tokens, "errors": errors})
            save_cp(cp)

        except Exception as e:
            errors += 1
            log.error(f"배치 오류: {e}")
            conn.rollback()
            time.sleep(5)

        time.sleep(0.2)  # Rate limit 방지

    cur.execute("SELECT COUNT(*) FROM consult_knowledge WHERE embedding_openai IS NOT NULL")
    done = cur.fetchone()[0]
    actual_cost = total_tokens / 1_000_000 * 0.020

    log.info("=" * 60)
    log.info(f"OpenAI 임베딩 완료! {processed:,}건 처리 | DB: {done:,}건")
    log.info(f"실제 비용: ~${actual_cost:.4f} (₩{actual_cost*1380:.0f})")
    log.info("다음: migrate_dual_embedding.sql의 HNSW 인덱스(openai) 주석 해제 후 실행")
    conn.close()

if __name__ == "__main__":
    main()
