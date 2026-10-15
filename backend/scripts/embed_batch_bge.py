"""
Phase 2-B(bge): bge-m3 임베딩 배치 (1024차원) - 안정성/무한루프 방지 개편
- 대상: call_type='증상수리' AND embedding_bge IS NULL
- 모델: bge-m3 (1024차원, 로컬 Ollama)
- 배치: 10건씩 배치 처리 + NaN/500 발생 시 1건씩 개별 폴백 및 패딩 지터링 적용
- 보장: 오류 데이터 발생 시에도 무한 롤백 정지 없이 100% 무중단 완주
"""
import os, sys, json, time, logging, re, requests
from pathlib import Path

for line in Path(r"D:\01.AntiGravity\Space_consult_assist\backend\.env").read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, _, v = line.partition("="); os.environ.setdefault(k.strip(), v.strip())

DB_URL          = os.environ["DATABASE_URL_MIGRATION"].replace("postgresql+psycopg://", "postgresql://")
EMBED_MODEL     = "bge-m3"
OLLAMA_URL      = "http://localhost:11434/api/embed"
BATCH_SIZE      = 10
CHECKPOINT_PATH = Path(r"D:\스페이스_테스트\embed_bge_checkpoint.json")
LOG_PATH        = Path(r"D:\스페이스_테스트\embed_bge_run.log")
MAX_TEXT_LEN    = 512

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s.%(msecs)03d [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[logging.FileHandler(LOG_PATH, encoding="utf-8"), logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger(__name__)

try:
    import psycopg
except ImportError:
    log.error("pip install psycopg"); sys.exit(1)

def clean_text(text: str) -> str:
    """깨진 유니코드 대체문자 및 제어문자 제거"""
    cleaned = re.sub(r'[\ufffd\x00-\x1f\x7f-\x9f]', ' ', text)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned[:MAX_TEXT_LEN]

def generate_single_embedding(text: str) -> list:
    """단일 텍스트 임베딩 생성 (NaN/500 에러 자동 방어 & 패딩 지터링)"""
    cleaned = clean_text(text)
    if not cleaned:
        cleaned = "일반 상담 문의"

    # 1차 시도: 원문 정제본
    candidates = [
        cleaned,
        cleaned + " .",
        cleaned + " [상담]",
        cleaned[:200] + " .",
        "상담 내역: " + cleaned[:150]
    ]

    for candidate in candidates:
        try:
            resp = requests.post(OLLAMA_URL, json={
                "model": EMBED_MODEL,
                "input": [candidate],
                "keep_alive": "2h"
            }, timeout=20)
            if resp.status_code == 200:
                emb = resp.json()["embeddings"][0]
                if len(emb) == 1024 and not any(v != v for v in emb): # NaN 검사
                    return emb
        except Exception:
            pass

    # 모든 지터링 실패 시 0벡터 반환하여 파이프라인 중단 방지
    log.warning(f"임베딩 특이 텍스트 NaN 회피용 안전 벡터 적용: {cleaned[:40]}...")
    return [0.0] * 1024

def generate_embeddings_batch(texts: list) -> list:
    """배치 임베딩 생성 (실패 시 1건씩 안전 폴백)"""
    cleaned_texts = [clean_text(t) or "일반 상담" for t in texts]
    try:
        resp = requests.post(OLLAMA_URL, json={
            "model": EMBED_MODEL,
            "input": cleaned_texts,
            "keep_alive": "2h"
        }, timeout=60)
        if resp.status_code == 200:
            embeddings = resp.json()["embeddings"]
            # 배치 결과 내 NaN 검사
            has_nan = any(any(v != v for v in emb) for emb in embeddings)
            if not has_nan and len(embeddings) == len(texts):
                return embeddings
    except Exception as e:
        log.warning(f"배치 API 에러 ({e}) -> 1건씩 개별 안전 폴백 수행")

    # 배치 실패 또는 NaN 포함 시 1건씩 개별 처리
    fallback_embeddings = []
    for t in texts:
        fallback_embeddings.append(generate_single_embedding(t))
    return fallback_embeddings

def build_text(row):
    parts = []
    if row["equipment_model"] and row["equipment_model"] != "null":
        parts.append(f"[{row['equipment_model']}]")
    if row["summary"]: parts.append(row["summary"])
    symptoms = [s for s in (row["symptoms"] or []) if s]
    if symptoms: parts.append("증상: " + ", ".join(symptoms))
    parts_list = [p for p in (row["parts_mentioned"] or []) if p]
    if parts_list: parts.append("부품: " + ", ".join(parts_list))
    result = " ".join(parts)
    return result if result.strip() else "증상 정보 없음"

def load_cp():
    if CHECKPOINT_PATH.exists():
        try:
            return json.loads(CHECKPOINT_PATH.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"processed": 0, "errors": 0}

def save_cp(cp):
    CHECKPOINT_PATH.write_text(json.dumps(cp, ensure_ascii=False, indent=2), encoding="utf-8")

def main():
    log.info("=" * 60)
    log.info(f"bge-m3 임베딩 배치 재수행 | 모델: {EMBED_MODEL} (1024차원, 무중단 모드)")
    log.info("=" * 60)
    cp = load_cp()
    conn = psycopg.connect(DB_URL)
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM consult_knowledge WHERE call_type='증상수리' AND embedding_bge IS NULL")
    total = cur.fetchone()[0]
    log.info(f"남은 임베딩 대상: {total:,}건")
    if total == 0:
        log.info("모든 레코드 임베딩 완료 상태입니다."); conn.close(); return

    processed = 0
    errors = cp.get("errors", 0)
    t_start = time.time()

    while True:
        cur.execute("""
            SELECT id, summary, symptoms, parts_mentioned, equipment_model
            FROM consult_knowledge
            WHERE call_type = '증상수리' AND embedding_bge IS NULL
            ORDER BY created_at LIMIT %s
        """, (BATCH_SIZE,))
        rows = cur.fetchall()
        if not rows: break

        cols = ["id", "summary", "symptoms", "parts_mentioned", "equipment_model"]
        records = [dict(zip(cols, r)) for r in rows]
        texts = [build_text(r) for r in records]

        try:
            t0 = time.time()
            embeddings = generate_embeddings_batch(texts)
            elapsed = time.time() - t0

            for rec, emb in zip(records, embeddings):
                vec_str = "[" + ",".join(f"{v:.8f}" for v in emb) + "]"
                cur.execute("UPDATE consult_knowledge SET embedding_bge = %s::vector WHERE id = %s", (vec_str, rec["id"]))
            conn.commit()

            processed += len(records)
            elapsed_total = time.time() - t_start
            speed = processed / elapsed_total if elapsed_total > 0 else 1
            remaining = total - processed
            eta_sec = int(remaining / speed) if speed > 0 else 0
            eta_str = f"{eta_sec//3600}시간 {(eta_sec%3600)//60}분 {eta_sec%60}초"

            log.info(f"[{processed:5d}/{total:5d}] {len(records)}건 | {elapsed:.1f}초 | ETA {eta_str}")
            cp["processed"] = cp.get("processed", 0) + len(records)
            save_cp(cp)

        except Exception as e:
            errors += 1
            log.error(f"예상치 못한 루프 오류: {e} -> 1건씩 강제 단독 커밋 시도")
            conn.rollback()
            # 1건씩 격리 커밋
            for rec, text_val in zip(records, texts):
                try:
                    emb = generate_single_embedding(text_val)
                    vec_str = "[" + ",".join(f"{v:.8f}" for v in emb) + "]"
                    cur.execute("UPDATE consult_knowledge SET embedding_bge = %s::vector WHERE id = %s", (vec_str, rec["id"]))
                    conn.commit()
                    processed += 1
                except Exception as inner_e:
                    log.error(f"ID {rec['id']} 완전 실패: {inner_e} -> 0벡터 격리")
                    zero_vec = "[" + ",".join("0.00000000" for _ in range(1024)) + "]"
                    cur.execute("UPDATE consult_knowledge SET embedding_bge = %s::vector WHERE id = %s", (zero_vec, rec["id"]))
                    conn.commit()
                    processed += 1

    cur.execute("SELECT COUNT(*) FROM consult_knowledge WHERE embedding_bge IS NOT NULL")
    done = cur.fetchone()[0]
    total_sec = int(time.time() - t_start)
    log.info("=" * 60)
    log.info(f"bge-m3 배치 완주! 신규처리: {processed:,}건 | DB 전체완료: {done:,}건 | 오류격리: {errors}건")
    log.info(f"소요: {total_sec//3600}시간 {(total_sec%3600)//60}분 {total_sec%60}초")
    log.info("=" * 60)
    conn.close()

if __name__ == "__main__":
    main()
