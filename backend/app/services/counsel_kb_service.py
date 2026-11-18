"""상담 분류 LLM 폴백 및 벡터·룰 기반 KB 복합 검색 서비스."""

import asyncio
import hashlib
import json
import logging
import os
import re
import uuid

import httpx
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings

logger = logging.getLogger(__name__)


async def fallback_llm_classification(user_text: str, db: AsyncSession) -> dict:
    """Ollama를 사용하여 분류 (Pydantic Config 설정 모델 사용)"""
    settings = get_settings()
    ollama_url = f"{settings.ollama_base_url.rstrip('/')}/api/generate"
    model_name = settings.ollama_model
    
    prompt = f"""다음 고객의 상담 내용을 분석하여 부품코드와 키워드를 추출하세요.
가능한 부품코드: SALES_INQUIRY, SCHEDULE_DELIVERY, SUCTION, POWER, DRIVE_BRUSH, WATER_SOLENOID, CHASSIS, WATER_NO_FLOW, BRUSH_WIRE, BRUSH_COVER, FORWARD_FAIL, WATER_SUPPLY_FAIL, BRUSH_FAIL, CHARGER_FAIL, POWER_FAIL, CHARGE_INDICATOR, INQUIRY_ETC, IRRELEVANT

상담내용: "{user_text}"

결과를 반드시 아래 JSON 형식으로만 응답하세요. 다른 설명은 포함하지 마세요.
{{"keyword": "가장 핵심적인 증상 키워드", "part_code": "위 목록 중 하나"}}
"""
    p_hash = hashlib.sha256(user_text.encode('utf-8')).hexdigest()
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(ollama_url, json={
                "model": model_name,
                "prompt": prompt,
                "stream": False,
                "format": "json"
            })
            if res.status_code == 200:
                raw_response = res.json().get("response", "{}")
                # LLM JSON 3중 방어 (헌장 10.7)
                clean_json = raw_response.strip()
                if clean_json.startswith("```json"):
                    clean_json = clean_json[7:]
                if clean_json.startswith("```"):
                    clean_json = clean_json[3:]
                if clean_json.endswith("```"):
                    clean_json = clean_json[:-3]
                clean_json = clean_json.strip()
                
                parsed = json.loads(clean_json)
                keyword = parsed.get("keyword", "기타")
                part_code = parsed.get("part_code", "INQUIRY_ETC")
                
                # LLM 성공 로그 기록
                log_q = text("""
                    INSERT INTO space_llm_logs (id, prompt_text, prompt_hash, response_text, model_name, latency_ms, is_error, cache_hit, client_type)
                    VALUES (:id, :prompt, :phash, :response, :model, :latency, false, false, 'desktop')
                """)
                await db.execute(log_q, {
                    "id": str(uuid.uuid4()),
                    "prompt": user_text, 
                    "phash": p_hash,
                    "response": json.dumps(parsed, ensure_ascii=False),
                    "model": model_name,
                    "latency": int(res.elapsed.total_seconds() * 1000) if hasattr(res, 'elapsed') else 0
                })

                return {
                    "keyword": keyword,
                    "part_code": part_code
                }
    except Exception as e:
        logger.error(f"LLM Fallback failed: {e}")
        # LLM 실패 로그 기록
        try:
            log_q = text("""
                INSERT INTO space_llm_logs (id, prompt_text, prompt_hash, response_text, model_name, latency_ms, is_error, error_message, cache_hit, client_type)
                VALUES (:id, :prompt, :phash, NULL, :model, 0, true, :err, false, 'desktop')
            """)
            await db.execute(log_q, {
                "id": str(uuid.uuid4()), 
                "prompt": user_text, 
                "phash": p_hash, 
                "model": model_name,
                "err": str(e)
            })
        except Exception as log_err:
            logger.error(f"Failed to write error to llm_logs: {log_err}")
    
    return {"keyword": "분류 불가", "part_code": "INQUIRY_ETC"}


# ─────────────────────────────────────────────────────────────
# 공통 헬퍼: 쿼리 임베딩 생성 (OpenAI 우선 → bge-m3 폴백)
# ─────────────────────────────────────────────────────────────
OLLAMA_EMBED_URL = "http://localhost:11434/api/embed"
BGE_MODEL        = "bge-m3"
NOMIC_MODEL      = "nomic-embed-text"

async def _get_openai_embedding(query: str) -> list | None:
    """OpenAI text-embedding-3-small 1536차원. 실패 시 None."""
    try:
        import openai as _oai
        settings = get_settings()
        key = getattr(settings, "openai_api_key", None) or os.environ.get("OPENAI_API_KEY", "")
        if not key:
            return None
        client = _oai.AsyncOpenAI(api_key=key)
        resp = await client.embeddings.create(
            model="text-embedding-3-small", input=[query]
        )
        return resp.data[0].embedding
    except Exception as e:
        logger.warning(f"OpenAI embedding 실패: {e}")
        return None

async def _get_bge_embedding(query: str) -> list | None:
    """Ollama bge-m3 1024차원 (NaN 방어 패딩 지터링 내장). 실패 시 None."""
    clean_q = query.strip()[:512]
    candidates = [clean_q, clean_q + " .", clean_q + " [상담]", clean_q[:200] + " ."]
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            for cand in candidates:
                try:
                    resp = await client.post(
                        OLLAMA_EMBED_URL,
                        json={"model": BGE_MODEL, "input": [cand], "keep_alive": "2h"}
                    )
                    if resp.status_code == 200:
                        emb = resp.json()["embeddings"][0]
                        if len(emb) == 1024 and not any(v != v for v in emb):
                            return emb
                except Exception:
                    continue
    except Exception as e:
        logger.warning(f"bge-m3 embedding 실패: {e}")
    return None

async def _get_nomic_embedding(query: str) -> list | None:
    """Ollama nomic-embed-text 768차원. 실패 시 None."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                OLLAMA_EMBED_URL,
                json={"model": NOMIC_MODEL, "input": [query[:512]], "keep_alive": "2h"}
            )
            if resp.status_code == 200:
                emb = resp.json()["embeddings"][0]
                if len(emb) == 768:
                    return emb
    except Exception as e:
        logger.warning(f"nomic embedding 실패: {e}")
    return None


_BACKEND_DOMAIN_NORMALIZATIONS = [
    (re.compile(r"(?:에스|애스|엑스|S|X)\s*(?:12|십\s*이|일\s*이|트웰브)\s*(?:엘|L)?|f10이", re.I), "S12"),
    (re.compile(r"(?:더블유|떠블유|W)\s*(?:15|십\s*오|일\s*오)", re.I), "W15"),
    (re.compile(r"(?:더블유|떠블유|W)\s*(?:12|십\s*이|일\s*이)", re.I), "W12"),
    (re.compile(r"(?:제이|재이|J)\s*(?:600|육\s*백|육백)\s*(?:티|T)?", re.I), "J600T"),
    (re.compile(r"(?:제이|재이|J)\s*(?:800|팔\s*백|팔백)\s*(?:에이\s*디|AD)?", re.I), "J800"),
    (re.compile(r"(?:제이|재이|J)\s*(?:900|구\s*백|구백)", re.I), "J900"),
    (re.compile(r"(?:더\s*뉴\s*)?(?:에스|애스|S)\s*(?:7|칠|세븐|쎄븐)\s*(?:피|P)?(?![0-9])", re.I), "S7"),
    (re.compile(r"(?:에스|애스|S)\s*(?:5(?![0-9])|파이브|오(?=\s|$|[이가은는을를의로도만]))", re.I), "S5"),
    (re.compile(r"(?:에스|애스|S)\s*(?:3(?![0-9])|쓰리|삼(?=\s|$|[이가은는을를의로도만]))", re.I), "S3"),
    (re.compile(r"(?:알|R)\s*(?:3(?![0-9])|쓰리|삼(?=\s|$|[이가은는을를의로도만]))", re.I), "R3"),
    (re.compile(r"솔리노이드|솔노이드|소레노이드|솔래노이드|솔로노이드|슬레노이드|셀레노이드|솔레노이트|솔레노드|솔리노드|솔노드|솔\s*밸브|솔\s*벨브", re.I), "솔레노이드"),
    (re.compile(r"스퀴즈|스키지|스키즈|스끼지|스끼즈|스크지|스쿠지|스퀴시|스위지|수키지|수퀴지|물받이\s*고무|뒤에\s*고무날", re.I), "스퀴지"),
    (re.compile(r"흡입\s*모타|흐빕\s*모터|흡입\s*못터|흡잉\s*모터|석션\s*모터|석션\s*모타|바큠\s*모터|진공\s*모타", re.I), "흡입 모터"),
    (re.compile(r"프로토\s*밸브|플롯\s*밸브|플로터\s*밸브|플로트\s*벨브|프로트\s*밸브|만수\s*차단볼|만수\s*부표", re.I), "플로트 밸브"),
    (re.compile(r"액츄에이터|엑추에이터|엑츄에이터|액추레이터|엑추레이터|액추에이타", re.I), "액추에이터"),
    (re.compile(r"앤더슨\s*잭|엔더슨\s*잭|언더슨\s*잭|안데르센\s*잭|엔더슨\s*커넥터", re.I), "앤더슨 커넥터"),
    (re.compile(r"패트\s*드라이버|팻\s*드라이버|페드\s*드라이버|패드\s*드라이바|페드판", re.I), "패드 드라이버"),
    (re.compile(r"밧데리|빠떼리|바떼리|배떠리|밧때리", re.I), "배터리"),
    (re.compile(r"(?:부셔|뿌셔)(?:짐|졌(?:어요|어|네)?|져(?:요|서)?)", re.I), "부서짐"),
    (re.compile(r"뿌러(?:짐|졌(?:어요|어|네)?|져(?:요|서)?)", re.I), "부러짐"),
    (re.compile(r"(?:뽀혔|뽀힘|뽑훴)(?:어요|어|네)?", re.I), "뽑힘"),
]

_BACKEND_NEG_STATE_REGEX = re.compile(
    r"([가-힣A-Za-z0-9]{1,10}(?:\s+[가-힣A-Za-z0-9]{1,10})?)\s*"
    r"(?:아예\s*|전혀\s*|자꾸\s*)?(?:작동[이가은는]?\s*|가동[이가은는]?\s*|회전[이가은는]?\s*)?"
    r"(안\s*됨|안\s*돼(?:요|서)?|안\s*되(?:요|네)?|안\s*됌|불가(?:능)?|"
    r"파손(?:됨|됐)?|깨짐|깨졌(?:어요|어)?|부서짐|부서졌(?:어요|어)?|부러짐|부러졌(?:어요|어)?|"
    r"빠짐|빠졌(?:어요|어)?|뽑힘|뽑혔(?:어요|어)?|끊어짐|끊어졌(?:어요|어)?|찢어짐|찢어졌(?:어요|어)?|막힘|막혔(?:어요|어)?|고장|불량|먹통)",
    re.I,
)


def _normalize_domain_query(raw: str) -> str:
    res = raw.strip()
    for pat, repl in _BACKEND_DOMAIN_NORMALIZATIONS:
        res = pat.sub(repl, res)
    return res


def _extract_negative_states_backend(text_val: str) -> list[dict]:
    results = []
    for m in _BACKEND_NEG_STATE_REGEX.finditer(text_val):
        raw_target = re.sub(r"^(?:J600T?|J800(?:AD)?|J900|S12L?|S7P?|S5|S3|S2|S1|W12|W15|R3)\s*", "", m.group(1).strip(), flags=re.I)
        target = re.sub(r"[이가은는을를도만의]$", "", raw_target).strip() if len(raw_target) >= 2 else raw_target.strip()
        pred = m.group(2).strip()
        if not target:
            continue
        results.append({
            "target": target,
            "predicate": pred,
            "summary": f"{target} {pred}",
        })
    return results


async def execute_kb_search(
    text_input: str,
    limit: int,
    equipment_model: str | None,
    db: AsyncSession,
) -> dict:
    """
    증상 텍스트 KB 복합 검색:
    1) OpenAI 1536차원 벡터 검색 (우선) → bge-m3 1024차원 (폴백) → ILIKE/pg_trgm (최종폴백)
    2) symptom_rules: pg_trgm 룰 기반 매칭
    3) 부정적 상태표현 대상 명사 추출 병행
    """
    query_text = _normalize_domain_query(text_input)
    extracted_neg_states = _extract_negative_states_backend(query_text)
    target_hint = extracted_neg_states[0]["target"] if extracted_neg_states else query_text

    # ── 1) OpenAI 임베딩 우선 → bge-m3 폴백 ────────────────────
    embedding    = await _get_openai_embedding(query_text)
    embed_engine = "openai"
    vec_dim      = 1536
    match_fn     = "match_similar_openai"

    if not embedding:
        embedding    = await _get_bge_embedding(query_text)
        embed_engine = "bge"
        vec_dim      = 1024
        match_fn     = "match_similar_bge"

    search_mode = f"vector:{embed_engine}" if embedding else "text"
    kb_results: list = []

    if embedding:
        # ── 1-A) pgvector 의미 검색 (HNSW) ──────────────────────
        vec_str   = "[" + ",".join(f"{v:.8f}" for v in embedding) + "]"
        vec_limit = limit * 3 if equipment_model else limit
        vec_sql   = text(f"""
            SELECT id, summary, equipment_model, symptoms,
                   parts_mentioned, action_items, urgency, similarity
            FROM {match_fn}(CAST(:vec AS vector({vec_dim})), :lim, '증상수리')
        """)
        vec_res  = await db.execute(vec_sql, {"vec": vec_str, "lim": vec_limit})
        vec_rows = vec_res.fetchall()

        # 장비 모델 필터 후처리
        if equipment_model:
            eq_lower = equipment_model.lower()
            vec_rows = [
                r for r in vec_rows
                if r.equipment_model and eq_lower in r.equipment_model.lower()
            ][:limit]

        kb_results = [
            {
                "id":              str(r.id),
                "summary":         r.summary or "",
                "equipment_model": r.equipment_model or "",
                "symptoms":        list(r.symptoms or []),
                "parts_mentioned": list(r.parts_mentioned or []),
                "action_items":    list(r.action_items or []),
                "urgency":         r.urgency or "보통",
                "similarity":      round(float(r.similarity), 3),
            }
            for r in vec_rows
        ]
    else:
        # ── 1-B) pg_trgm + ILIKE 텍스트 폴백 (대상 명사 target_hint 병행 매칭) ──
        eq_cond = "AND equipment_model ILIKE :eq" if equipment_model else ""
        fb_sql = text(f"""
            SELECT id, summary, equipment_model, symptoms, parts_mentioned, action_items, urgency,
                   GREATEST(
                     COALESCE(similarity(summary, :q), 0),
                     COALESCE(word_similarity(:q, summary), 0),
                     COALESCE(similarity(array_to_string(symptoms, ' '), :q), 0),
                     COALESCE(word_similarity(:q, array_to_string(symptoms, ' ')), 0),
                     COALESCE(word_similarity(:q_target, array_to_string(parts_mentioned, ' ')), 0),
                     COALESCE(word_similarity(:q_target, array_to_string(symptoms, ' ')), 0)
                   ) AS sim
            FROM space_consult_knowledge
            WHERE call_type   = '증상수리'
              AND is_excluded = false
              AND (
                summary ILIKE '%' || :q_raw || '%'
                OR array_to_string(symptoms, ' ') ILIKE '%' || :q_raw || '%'
                OR summary ILIKE '%' || :q_target || '%'
                OR array_to_string(parts_mentioned, ' ') ILIKE '%' || :q_target || '%'
                OR word_similarity(:q, array_to_string(symptoms, ' ')) > 0.28
                OR word_similarity(:q, summary) > 0.28
              )
              {eq_cond}
            ORDER BY sim DESC
            LIMIT :lim
        """)
        params: dict = {"q": query_text, "q_raw": query_text, "q_target": target_hint, "lim": limit}
        if equipment_model:
            params["eq"] = f"%{equipment_model}%"

        fb_res = await db.execute(fb_sql, params)
        kb_results = [
            {
                "id":              str(r.id),
                "summary":         r.summary or "",
                "equipment_model": r.equipment_model or "",
                "symptoms":        list(r.symptoms or []),
                "parts_mentioned": list(r.parts_mentioned or []),
                "action_items":    list(r.action_items or []),
                "urgency":         r.urgency or "보통",
                "similarity":      round(float(r.sim), 2) if r.sim else 0.0,
            }
            for r in fb_res.fetchall()
        ]

    # ── 2) 룰 기반 검색 (symptom_rules: 전체 문장 + 추출된 대상 명사 병행) ──
    rule_sql = text("""
        SELECT keyword, part_code, action_script,
               GREATEST(
                 COALESCE(similarity(keyword, :q), 0),
                 COALESCE(word_similarity(keyword, :q), 0),
                 COALESCE(word_similarity(:q_target, keyword), 0)
               ) AS sim
        FROM space_symptom_rules
        WHERE similarity(keyword, :q) > 0.25
           OR word_similarity(keyword, :q) > 0.30
           OR keyword ILIKE '%' || :q_raw || '%'
           OR keyword ILIKE '%' || :q_target || '%'
        ORDER BY sim DESC
        LIMIT 1
    """)
    rule_res  = await db.execute(rule_sql, {"q": query_text, "q_raw": query_text, "q_target": target_hint})
    rule_row  = rule_res.fetchone()

    rule_result = None
    if rule_row:
        actions = rule_row.action_script
        if isinstance(actions, str):
            try:
                actions = json.loads(actions)
            except Exception:
                actions = [actions]
        rule_result = {
            "keyword":       rule_row.keyword,
            "part_code":     rule_row.part_code,
            "action_script": list(actions or []),
            "similarity":    round(float(rule_row.sim), 2) if rule_row.sim else 0.0,
        }

    # ── 3) 통합 대응 조치 계획 (Action Plan) 구조화 ───────────────
    # 룰 기반 액션 우선, 없을 시 최상위 KB 사례의 action_items 취합
    action_items_final = []
    part_code_final = rule_result.get("part_code") if rule_result else "SUCTION"
    keyword_final = rule_result.get("keyword") if rule_result else query_text

    if rule_result and rule_result.get("action_script"):
        action_items_final = rule_result["action_script"]
    elif kb_results and kb_results[0].get("action_items"):
        action_items_final = kb_results[0]["action_items"]
        if kb_results[0].get("parts_mentioned"):
            part_code_final = kb_results[0]["parts_mentioned"][0]
    
    if not action_items_final:
        action_items_final = [
            "현장 증상 재확인 및 장비 가동 정지 안내",
            "흡입/구동부 이물질 및 필터 오염 상태 육안 점검 안내",
            "동영상 또는 사진 접수 후 부품 재고 파악",
            "자가 조치 불가 시 정비사 현장 출동 예약 배차"
        ]

    # 상담원 구두 설명용 표준 안내 스크립트
    call_script = f"고객님, {keyword_final} 증상의 경우 {action_items_final[0]} 조치를 먼저 진행해 주셔야 합니다."

    action_plan = {
        "keyword": keyword_final,
        "part_code": part_code_final,
        "urgency": kb_results[0].get("urgency") if kb_results else "보통",
        "steps": action_items_final,
        "call_script": call_script,
        "can_self_resolve": "모터 소손" not in query_text and "파손" not in query_text
    }

    # 임베딩 건수 (전수 5,854건 완주 캐시값으로 호주 DB 추가 왕복 제거)
    embedding_count = 5854

    return {
        "search_mode":               search_mode,
        "action_plan":               action_plan,
        "rule_result":               rule_result,
        "kb_results":                kb_results,
        "extracted_negative_states": extracted_neg_states,
        "embedding_count":           embedding_count,
    }


async def execute_kb_compare(
    text_input: str,
    limit: int,
    db: AsyncSession,
) -> dict:
    """동일 쿼리를 로컬(bge/nomic) / OpenAI(1536) 두 엔진으로 검색하여 병렬 비교 반환."""
    query_text = text_input.strip()
    def _rows_to_list(rows) -> list:
        return [
            {
                "id":              str(r.id),
                "summary":         r.summary or "",
                "equipment_model": r.equipment_model or "",
                "symptoms":        list(r.symptoms or []),
                "parts_mentioned": list(r.parts_mentioned or []),
                "action_items":    list(r.action_items or []),
                "urgency":         r.urgency or "보통",
                "similarity":      round(float(r.sim), 3) if r.sim else 0.0,
            }
            for r in rows
        ]

    # ── 컬럼 존재 여부 확인 ──────────────────────────────────────
    col_check = await db.execute(text("""
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'consult_knowledge'
          AND column_name IN ('embedding_bge', 'embedding_nomic', 'embedding', 'embedding_openai')
    """))
    existing_cols = {r[0] for r in col_check.fetchall()}

    local_col = "embedding_bge" if "embedding_bge" in existing_cols else (
                "embedding_nomic" if "embedding_nomic" in existing_cols else (
                "embedding" if "embedding" in existing_cols else None))
    openai_col = "embedding_openai" if "embedding_openai" in existing_cols else None

    # ── 로컬(bge/nomic) 카운트 ───────────────────────────────────
    local_count = 0
    if local_col:
        r = await db.execute(text(
            f"SELECT COUNT(*) FROM space_consult_knowledge WHERE {local_col} IS NOT NULL"
        ))
        local_count = r.scalar() or 0

    # ── openai 카운트 ────────────────────────────────────────────
    openai_count = 0
    if openai_col:
        r = await db.execute(text(
            f"SELECT COUNT(*) FROM space_consult_knowledge WHERE {openai_col} IS NOT NULL"
        ))
        openai_count = r.scalar() or 0

    # ── 양대 엔진 임베딩 비동기 병렬 생성 (asyncio.gather: 네트워크/추론 대기시간 50% 단축) ──
    local_task = _get_bge_embedding(query_text) if local_col == "embedding_bge" else (
                 _get_nomic_embedding(query_text) if local_col else asyncio.sleep(0, result=None))
    openai_task = _get_openai_embedding(query_text) if openai_count > 0 else asyncio.sleep(0, result=None)

    local_emb, openai_emb = await asyncio.gather(local_task, openai_task)

    # ── 로컬 벡터 검색 (bge-m3 1024차원 / nomic 768차원) ─────────
    local_results = []
    if local_count > 0:
        match_fn = "match_similar_bge" if local_col == "embedding_bge" else "match_similar_nomic"
        vec_dim = 1024 if local_col == "embedding_bge" else 768

        if local_emb:
            vec_str = "[" + ",".join(f"{v:.8f}" for v in local_emb) + "]"
            try:
                lr = await db.execute(
                    text(f"SELECT id, summary, equipment_model, symptoms, parts_mentioned, action_items, urgency, similarity FROM {match_fn}(CAST(:vec AS vector({vec_dim})), :lim, '증상수리')"),
                    {"vec": vec_str, "lim": limit}
                )
                local_results = [
                    {
                        "id": str(r.id), "summary": r.summary or "",
                        "equipment_model": r.equipment_model or "",
                        "symptoms": list(r.symptoms or []),
                        "parts_mentioned": list(r.parts_mentioned or []),
                        "action_items": list(r.action_items or []),
                        "urgency": r.urgency or "보통",
                        "similarity": round(float(r.similarity), 3),
                    }
                    for r in lr.fetchall()
                ]
            except Exception as e:
                logger.warning(f"로컬 벡터 검색 실패: {e}")

        if not local_results:
            # 폴백: ILIKE 유사도 검색
            lr = await db.execute(text(f"""
                SELECT id, summary, equipment_model, symptoms, parts_mentioned, action_items, urgency,
                       GREATEST(COALESCE(similarity(summary,:q),0), COALESCE(similarity(array_to_string(symptoms,' '),:q),0)) AS sim
                FROM space_consult_knowledge
                WHERE call_type='증상수리' AND is_excluded=false AND {local_col} IS NOT NULL
                  AND (summary ILIKE '%'||:qr||'%' OR array_to_string(symptoms,' ') ILIKE '%'||:qr||'%')
                ORDER BY sim DESC LIMIT :lim
            """), {"q": query_text, "qr": query_text, "lim": limit})
            local_results = [
                {"id": str(r.id), "summary": r.summary or "", "equipment_model": r.equipment_model or "",
                 "symptoms": list(r.symptoms or []), "parts_mentioned": list(r.parts_mentioned or []),
                 "action_items": list(r.action_items or []), "urgency": r.urgency or "보통",
                 "similarity": round(float(r.sim), 2) if r.sim else 0.0}
                for r in lr.fetchall()
            ]

    # ── OpenAI 벡터 검색 (1536차원) ──────────────────────────────
    openai_results = []
    if openai_count > 0:
        if openai_emb:
            vec_str = "[" + ",".join(f"{v:.8f}" for v in openai_emb) + "]"
            try:
                or_ = await db.execute(
                    text("SELECT id, summary, equipment_model, symptoms, parts_mentioned, action_items, urgency, similarity FROM match_similar_openai(CAST(:vec AS vector(1536)), :lim, '증상수리')"),
                    {"vec": vec_str, "lim": limit}
                )
                openai_results = [
                    {
                        "id": str(r.id), "summary": r.summary or "",
                        "equipment_model": r.equipment_model or "",
                        "symptoms": list(r.symptoms or []),
                        "parts_mentioned": list(r.parts_mentioned or []),
                        "action_items": list(r.action_items or []),
                        "urgency": r.urgency or "보통",
                        "similarity": round(float(r.similarity), 3),
                    }
                    for r in or_.fetchall()
                ]
            except Exception as e:
                logger.warning(f"OpenAI 벡터 검색 함수 실패: {e}")

        if not openai_results:
            # 폴백: ILIKE 검색
            openai_sql = text(f"""
                SELECT id, summary, equipment_model, symptoms, parts_mentioned, action_items, urgency,
                       GREATEST(
                         COALESCE(similarity(summary, :q), 0),
                         COALESCE(similarity(array_to_string(symptoms,' '), :q), 0)
                       ) AS sim
                FROM space_consult_knowledge
                WHERE call_type = '증상수리'
                  AND is_excluded = false
                  AND {openai_col} IS NOT NULL
                  AND (
                    summary ILIKE '%' || :qr || '%'
                    OR array_to_string(symptoms,' ') ILIKE '%' || :qr || '%'
                  )
                ORDER BY sim DESC
                LIMIT :lim
            """)
            or_ = await db.execute(openai_sql, {"q": query_text, "qr": query_text, "lim": limit})
            openai_results = _rows_to_list(or_.fetchall())

    return {
        "query":          query_text,
        "nomic_results":  local_results,
        "local_results":  local_results,
        "openai_results": openai_results,
        "nomic_ready":    local_count > 0,
        "openai_ready":   openai_count > 0,
        "nomic_count":    local_count,
        "local_count":    local_count,
        "openai_count":   openai_count,
        "local_engine":   "bge-m3 (1024차원)" if local_col == "embedding_bge" else "nomic (768차원)",
    }
