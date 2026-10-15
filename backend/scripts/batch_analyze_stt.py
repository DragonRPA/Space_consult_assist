#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
STT 통화록 배치 분석기 (Ollama gemma3:12b)
-----------------------------------------------
1단계: 통화 유형 분류 (1차)
2단계: 증상수리 통화만 심층 분석 (2차)
3단계: Supabase consult_knowledge 테이블 upsert

실행:  python -X utf8 batch_analyze_stt.py
중단 후 재실행: 이미 처리된 파일 자동 건너뜀 (체크포인트 기반)
"""

import os, sys, json, time, re, datetime, logging
import requests, psycopg

# ─────────────────────────────────────────────
# 설정
# ─────────────────────────────────────────────
STT_DIR      = r'D:\스페이스_테스트\stt_texts'
CHECKPOINT   = r'D:\스페이스_테스트\batch_checkpoint.json'
ERROR_LOG    = r'D:\스페이스_테스트\batch_errors.jsonl'
OLLAMA_URL   = 'http://localhost:11434/api/generate'
MODEL        = 'gemma3:12b'
DB_URL       = 'postgresql://postgres.eknwzjcbchbefdlykqgl:jUHGAmVsSeXc1jdR@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres'
MIN_SIZE_B   = 300     # 300B 미만 노이즈 파일 건너뜀
TIMEOUT_SEC  = 90      # Ollama 응답 제한

# 로거
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(r'D:\스페이스_테스트\batch_run.log', encoding='utf-8')
    ]
)
log = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# 프롬프트
# ─────────────────────────────────────────────
PROMPT_1차 = """다음 통화 내용의 유형을 아래 6가지 중 정확히 하나만 한국어로 출력하세요.
다른 설명 없이 아래 단어 중 하나만 출력하세요.

증상수리 | 일정조율 | 영업 | 단순문의 | 개인통화 | 판별불가

통화내용:
{stt}

답변:"""

PROMPT_2차 = """당신은 청소차(스크러버·스위퍼) 전문업체 '주식회사 스페이스'의 고객상담 AI입니다.
취급 장비: J600T, J800, J800AD, J900, S1, S3, S5, S7, S7P, S12, S12L, R3, 쓰담 등

아래 통화 내용을 분석하여 반드시 JSON 형식으로만 응답하세요. 다른 설명 없이 JSON만 출력하세요.

{{
  "장비모델": "언급된 장비 모델명, 없으면 null",
  "긴급도": "긴급 또는 보통 또는 낮음",
  "증상목록": ["증상1", "증상2"],
  "언급부품": ["부품명1"],
  "조치항목": ["조치1", "조치2"],
  "요약": "1~2줄 한국어 요약"
}}

통화내용:
{stt}"""

# ─────────────────────────────────────────────
# 유틸
# ─────────────────────────────────────────────
def read_file(path):
    for enc in ('utf-8', 'cp949', 'euc-kr'):
        try:
            return open(path, encoding=enc).read()
        except:
            continue
    return None

def parse_filename(fn):
    """20211111_102517_하재욱사장(위너스텍) 형식 파싱"""
    stem = fn.replace('.txt', '')
    call_date = call_time = caller_id = None
    m = re.match(r'^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})_(.*)', stem)
    if m:
        y, mo, d, h, mi, s, rest = m.groups()
        try:
            call_date = datetime.date(int(y), int(mo), int(d))
            call_time = datetime.time(int(h), int(mi), int(s))
        except:
            pass
        caller_id = rest.strip()
    return stem, call_date, call_time, caller_id

def ollama_call(prompt, use_json=False):
    payload = {
        "model": MODEL,
        "prompt": prompt,
        "stream": False,
    }
    if use_json:
        payload["format"] = "json"
    resp = requests.post(OLLAMA_URL, json=payload, timeout=TIMEOUT_SEC)
    resp.raise_for_status()
    return resp.json().get("response", "").strip()

def clean_json(raw):
    s = raw.strip()
    for prefix in ("```json", "```"):
        if s.startswith(prefix):
            s = s[len(prefix):]
    if s.endswith("```"):
        s = s[:-3]
    return s.strip()

VALID_TYPES = {"증상수리", "일정조율", "영업", "단순문의", "개인통화", "판별불가"}

def classify_1차(stt_text):
    prompt = PROMPT_1차.format(stt=stt_text[:1500])
    raw = ollama_call(prompt, use_json=False)
    # 응답에서 유효 유형 추출
    for vt in VALID_TYPES:
        if vt in raw:
            return vt
    return "판별불가"

def analyze_2차(stt_text):
    prompt = PROMPT_2차.format(stt=stt_text[:2500])
    raw = ollama_call(prompt, use_json=True)
    data = json.loads(clean_json(raw))
    return {
        "equipment_model": data.get("장비모델"),
        "urgency":         data.get("긴급도"),
        "symptoms":        data.get("증상목록", []),
        "parts_mentioned": data.get("언급부품", []),
        "action_items":    data.get("조치항목", []),
        "summary":         data.get("요약"),
    }

# ─────────────────────────────────────────────
# 체크포인트
# ─────────────────────────────────────────────
def load_checkpoint():
    if os.path.exists(CHECKPOINT):
        return set(json.load(open(CHECKPOINT, encoding='utf-8')))
    return set()

def save_checkpoint(done_set):
    json.dump(list(done_set), open(CHECKPOINT, 'w', encoding='utf-8'), ensure_ascii=False)

def log_error(file_name, error):
    with open(ERROR_LOG, 'a', encoding='utf-8') as f:
        f.write(json.dumps({"file": file_name, "error": str(error), "ts": datetime.datetime.now().isoformat()}, ensure_ascii=False) + '\n')

# ─────────────────────────────────────────────
# DB upsert
# ─────────────────────────────────────────────
UPSERT_SQL = """
INSERT INTO consult_knowledge
    (file_name, call_date, call_time, caller_id, stt_text,
     call_type, equipment_model, urgency, symptoms, parts_mentioned,
     action_items, summary, analyzed_by)
VALUES
    (%(file_name)s, %(call_date)s, %(call_time)s, %(caller_id)s, %(stt_text)s,
     %(call_type)s, %(equipment_model)s, %(urgency)s, %(symptoms)s, %(parts_mentioned)s,
     %(action_items)s, %(summary)s, %(analyzed_by)s)
ON CONFLICT (file_name) DO UPDATE SET
    call_type       = EXCLUDED.call_type,
    equipment_model = EXCLUDED.equipment_model,
    urgency         = EXCLUDED.urgency,
    symptoms        = EXCLUDED.symptoms,
    parts_mentioned = EXCLUDED.parts_mentioned,
    action_items    = EXCLUDED.action_items,
    summary         = EXCLUDED.summary,
    analyzed_by     = EXCLUDED.analyzed_by,
    analyzed_at     = now()
"""

# ─────────────────────────────────────────────
# 메인
# ─────────────────────────────────────────────
def main():
    # 대상 파일 수집
    all_files = [
        fn for fn in sorted(os.listdir(STT_DIR))
        if fn.endswith('.txt') and os.path.getsize(os.path.join(STT_DIR, fn)) >= MIN_SIZE_B
    ]
    done = load_checkpoint()
    pending = [fn for fn in all_files if fn not in done]

    total     = len(all_files)
    already   = len(done)
    target    = len(pending)

    log.info(f"전체: {total:,}개 | 이미완료: {already:,}개 | 처리대상: {target:,}개")
    log.info(f"모델: {MODEL} | 최소파일크기: {MIN_SIZE_B}B")
    log.info("=" * 60)

    # 개인통화·판별불가는 DB 저장 제외 유형
    SKIP_SAVE = {"개인통화", "판별불가"}

    conn = psycopg.connect(DB_URL)
    cur  = conn.cursor()

    stats = {"증상수리": 0, "일정조율": 0, "영업": 0, "단순문의": 0, "개인통화": 0, "판별불가": 0, "오류": 0}
    start_all = time.time()

    for idx, fn in enumerate(pending, 1):
        path = os.path.join(STT_DIR, fn)
        file_name, call_date, call_time, caller_id = parse_filename(fn)
        elapsed_total = time.time() - start_all
        remaining_est = (elapsed_total / idx) * (target - idx) if idx > 1 else 0
        eta_str = str(datetime.timedelta(seconds=int(remaining_est)))

        log.info(f"[{idx:5d}/{target}] {fn[:50]} | ETA {eta_str}")

        try:
            stt_text = read_file(path)
            if not stt_text or len(stt_text.strip()) < 50:
                done.add(fn)
                continue

            t0 = time.time()

            # 1차 분류
            call_type = classify_1차(stt_text)
            t1 = time.time()

            # 2차 분석 (증상수리만)
            detail = {}
            if call_type == "증상수리":
                detail = analyze_2차(stt_text)
                t2 = time.time()
                log.info(f"  -> {call_type} | {detail.get('equipment_model')} | {detail.get('urgency')} | {round(t2-t0,1)}초")
            else:
                log.info(f"  -> {call_type} | {round(t1-t0,1)}초")

            stats[call_type] = stats.get(call_type, 0) + 1

            # 개인통화·판별불가는 저장 제외
            if call_type not in SKIP_SAVE:
                row = {
                    "file_name":       file_name,
                    "call_date":       call_date,
                    "call_time":       call_time,
                    "caller_id":       caller_id,
                    "stt_text":        stt_text[:10000],  # 최대 10KB
                    "call_type":       call_type,
                    "equipment_model": detail.get("equipment_model"),
                    "urgency":         detail.get("urgency"),
                    "symptoms":        detail.get("symptoms", []),
                    "parts_mentioned": detail.get("parts_mentioned", []),
                    "action_items":    detail.get("action_items", []),
                    "summary":         detail.get("summary"),
                    "analyzed_by":     MODEL,
                }
                cur.execute(UPSERT_SQL, row)
                conn.commit()

            done.add(fn)

            # 50건마다 체크포인트 저장
            if idx % 50 == 0:
                save_checkpoint(done)
                log.info(f"  [체크포인트 저장] {idx}건 완료")

        except KeyboardInterrupt:
            log.warning("사용자 중단 — 체크포인트 저장 중...")
            save_checkpoint(done)
            break
        except Exception as e:
            log.error(f"  [오류] {fn}: {e}")
            log_error(fn, e)
            stats["오류"] += 1
            done.add(fn)  # 오류 파일도 건너뛰고 계속 진행

    save_checkpoint(done)
    conn.close()

    total_sec = time.time() - start_all
    log.info("=" * 60)
    log.info(f"배치 완료 | 총 소요: {str(datetime.timedelta(seconds=int(total_sec)))}")
    log.info(f"분류 결과: {stats}")

    # DB 저장 건수 확인
    conn2 = psycopg.connect(DB_URL)
    cur2  = conn2.cursor()
    cur2.execute("SELECT call_type, COUNT(*) FROM consult_knowledge GROUP BY call_type ORDER BY COUNT(*) DESC")
    log.info("DB 저장 현황:")
    for row in cur2.fetchall():
        log.info(f"  {row[0]}: {row[1]:,}건")
    conn2.close()

if __name__ == "__main__":
    main()
