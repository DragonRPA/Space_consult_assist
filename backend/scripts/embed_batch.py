"""
Phase 2-B: nomic-embed-text 임베딩 배치 (Ollama 로컬)
- 대상: call_type='증상수리' AND embedding IS NULL (5,854건)
- 모델: nomic-embed-text (768차원, 로컬 무료)
- 배치: 50건씩 Ollama API 호출
- 재실행: embedding IS NULL 조건으로 자동 이어받기
"""

import os, sys, json, time, logging, requests
from pathlib import Path

ENV_PATH = Path(r"D:\01.AntiGravity\Space_consult_assist\backend\.env")
for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, _, v = line.partition("=")
        os.environ.setdefault(k.strip(), v.strip())

DB_URL          = os.environ["DATABASE_URL_MIGRATION"].replace("postgresql+psycopg://", "postgresql://")
EMBED_MODEL     = "nomic-embed-text"
OLLAMA_URL      = "http://localhost:11434/api/embed"
BATCH_SIZE      = 50
CHECKPOINT_PATH = Path(r"D:\스페이스_테스트\embed_checkpoint.json")
LOG_PATH        = Path(r"D:\스페이스_테스트\embed_run.log")

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
except ImportError:
    log.error("pip install psycopg 를 실행하세요.")
    sys.exit(1)

def generate_embeddings(texts: list) -> list:
    resp = requests.post(OLLAMA_URL, json={"model": EMBED_MODEL, "input": texts}, timeout=120)
    resp.raise_for_status()
    return resp.json()["embeddings"]

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
    return {"processed": 0, "errors": 0}

def save_cp(cp: dict):
    CHECKPOINT_PATH.write_text(json.dumps(cp, ensure_ascii=False, indent=2), encoding="utf-8")

def main():
    log.info("=" * 60)
    log.info(f"Phase 2-B 임베딩 배치 시작 | 모델: {EMBED_MODEL} (768차원)")
    log.info("=" * 60)

    cp = load_cp()
    conn = psycopg.connect(DB_URL)
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM consult_knowledge WHERE call_type='증상수리' AND embedding IS NULL")
    total = cur.fetchone()[0]
    log.info(f"임베딩 대상: {total:,}건")

    if total == 0:
        log.info("모든 레코드 임베딩 완료 상태.")
        conn.close()
        return

    processed = 0
    errors = cp["errors"]
    t_start = time.time()

    while True:
        cur.execute("""
            SELECT id, summary, symptoms, parts_mentioned, equipment_model
            FROM consult_knowledge
            WHERE call_type = '증상수리' AND embedding IS NULL
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
                    "UPDATE consult_knowledge SET embedding = %s::vector WHERE id = %s",
                    (vec_str, rec["id"])
                )
            conn.commit()

            processed += len(records)
            elapsed_total = time.time() - t_start
            speed = processed / elapsed_total if elapsed_total > 0 else 1
            remaining = total - processed
            eta_sec = int(remaining / speed) if speed > 0 else 0
            eta_str = f"{eta_sec//3600}시간 {(eta_sec%3600)//60}분"

            log.info(
                f"[{processed:5d}/{total:5d}] "
                f"{len(records)}건 | {elapsed:.1f}초 | "
                f"ETA {eta_str}"
            )

            cp["processed"] = cp.get("processed", 0) + len(records)
            save_cp(cp)

        except Exception as e:
            errors += 1
            log.error(f"배치 오류: {e}")
            conn.rollback()
            time.sleep(3)

    cur.execute("SELECT COUNT(*) FROM consult_knowledge WHERE embedding IS NOT NULL")
    done = cur.fetchone()[0]
    total_sec = int(time.time() - t_start)

    log.info("=" * 60)
    log.info(f"임베딩 배치 완료!")
    log.info(f"  처리: {processed:,}건 | DB 완료: {done:,}건 | 오류: {errors}건")
    log.info(f"  소요: {total_sec//3600}시간 {(total_sec%3600)//60}분 {total_sec%60}초")
    log.info("=" * 60)
    log.info("다음: HNSW 인덱스 생성 → 벡터 검색 활성화")
    conn.close()

if __name__ == "__main__":
    main()
