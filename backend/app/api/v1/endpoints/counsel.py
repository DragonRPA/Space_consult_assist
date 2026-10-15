import json
import re
import asyncio
import logging
import hashlib
import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel, Field
import httpx
import uuid

from app.core.database import get_db
from app.core.config import get_settings
from app.core.security import check_rate_limit, check_llm_rate_limit, get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)

class ClassifyRequest(BaseModel):
    text: str

class ClassifyResponse(BaseModel):
    keyword: str
    part_code: str
    action_script: List[str]
    source: str  # "rule" or "llm_fallback"
    confidence: float

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
                    INSERT INTO llm_logs (id, prompt_text, prompt_hash, response_text, model_name, latency_ms, is_error, cache_hit, client_type)
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
                INSERT INTO llm_logs (id, prompt_text, prompt_hash, response_text, model_name, latency_ms, is_error, error_message, cache_hit, client_type)
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


@router.post("/classify", response_model=ClassifyResponse, dependencies=[Depends(check_rate_limit)])
async def classify_text(
    req: ClassifyRequest, 
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    # 1. pg_trgm word_similarity 및 similarity 결합 검색 (symptom_rules)
    query = text("""
        SELECT keyword, part_code, action_script, 
               CASE 
                   WHEN :text LIKE '%' || keyword || '%' OR keyword LIKE '%' || :text || '%' THEN 0.95
                   ELSE GREATEST(word_similarity(keyword, :text), similarity(keyword, :text))
               END as sim
        FROM symptom_rules
        WHERE is_active = true AND (
            word_similarity(keyword, :text) >= 0.3 OR
            similarity(keyword, :text) >= 0.25 OR
            :text LIKE '%' || keyword || '%' OR
            keyword LIKE '%' || :text || '%'
        )
        ORDER BY sim DESC, priority DESC, source_count DESC
        LIMIT 1
    """)
    
    result = await db.execute(query, {"text": req.text})
    row = result.fetchone()

    if row:
        action_script = []
        if row.action_script:
            try:
                action_script = json.loads(row.action_script) if isinstance(row.action_script, str) else row.action_script
            except Exception as e:
                logger.warning(f"Failed to parse action_script for {row.keyword}: {e}")
                action_script = []
            
        return ClassifyResponse(
            keyword=row.keyword,
            part_code=row.part_code,
            action_script=action_script,
            source="rule",
            confidence=float(row.sim)
        )
    
    # 2. 일치하는 룰이 없으면 LLM Fallback 호출
    llm_res = await fallback_llm_classification(req.text, db)
    
    # Fallback 결과에 맞는 기본 스크립트 조회 (동일 부품코드의 대표 스크립트 1개)
    fallback_query = text("""
        SELECT action_script 
        FROM symptom_rules 
        WHERE part_code = :part_code AND is_active = true
        ORDER BY source_count DESC 
        LIMIT 1
    """)
    fb_result = await db.execute(fallback_query, {"part_code": llm_res["part_code"]})
    fb_row = fb_result.fetchone()
    
    action_script = []
    if fb_row and fb_row.action_script:
        try:
            action_script = json.loads(fb_row.action_script) if isinstance(fb_row.action_script, str) else fb_row.action_script
        except Exception as e:
            logger.warning(f"Failed to parse fallback action_script: {e}")
            action_script = []

    await db.commit()

    return ClassifyResponse(
        keyword=llm_res["keyword"],
        part_code=llm_res["part_code"],
        action_script=action_script,
        source="llm_fallback",
        confidence=0.5
    )

class CounselCreate(BaseModel):
    id: Optional[str] = None
    customer_id: Optional[str] = None
    customer_name: Optional[str] = "일반 고객"
    manager: Optional[str] = ""
    phone: Optional[str] = ""
    serial_number: Optional[str] = ""
    model_name: Optional[str] = ""
    keyword: Optional[str] = ""
    symptoms: str = Field(..., max_length=10000, description="증상 설명 (최대 10000자)")
    part_code: Optional[str] = ""
    action_taken: str = Field(..., max_length=50000, description="조치 내용 (최대 50000자)")
    is_completed: bool = True
    is_visit_required: bool = False
    counselor_name: Optional[str] = None
    session_snapshot: Optional[dict] = None

# ─────────────────────────────────────────────────────────────
# KB 검색 결과 즉시 제외 처리
# PATCH /api/v1/counsel/knowledge/{item_id}/exclude
# ─────────────────────────────────────────────────────────────
@router.patch("/knowledge/{item_id}/exclude", dependencies=[Depends(check_rate_limit)])
async def exclude_knowledge_item(
    item_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    상담 보조 결과 중 오분류·오염 항목을 즉시 제외 처리.
    is_excluded = true 로 설정 → 이후 모든 벡터 검색에서 자동 차단.
    """
    result = await db.execute(
        text("""
            UPDATE consult_knowledge
            SET is_excluded  = true,
                excluded_at  = CURRENT_TIMESTAMP,
                excluded_by  = :user_id
            WHERE id = :item_id
            RETURNING id
        """),
        {"item_id": str(item_id), "user_id": current_user.get("id", "unknown")}
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="항목을 찾을 수 없습니다.")

    await db.commit()
    logger.info(f"KB 항목 제외 처리: id={item_id}, by={current_user.get('id')}")
    return {"id": str(item_id), "status": "excluded"}


# ─────────────────────────────────────────────────────────────
# KB 제외 항목 복원 (관리자용)
# PATCH /api/v1/counsel/knowledge/{item_id}/restore
# ─────────────────────────────────────────────────────────────
@router.patch("/knowledge/{item_id}/restore", dependencies=[Depends(check_rate_limit)])
async def restore_knowledge_item(
    item_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """제외된 KB 항목을 검색 풀로 복원."""
    result = await db.execute(
        text("""
            UPDATE consult_knowledge
            SET is_excluded = false,
                excluded_at = NULL,
                excluded_by = NULL
            WHERE id = :item_id
            RETURNING id
        """),
        {"item_id": str(item_id)}
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="항목을 찾을 수 없습니다.")

    await db.commit()
    return {"id": str(item_id), "status": "restored"}


# ─────────────────────────────────────────────────────────────
# 제외 항목 현황 조회 (관리자 검토용)
# GET /api/v1/counsel/knowledge/excluded
# ─────────────────────────────────────────────────────────────
@router.get("/knowledge/excluded")
async def list_excluded_items(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """제외 처리된 KB 항목 목록 조회 (관리자 월별 검토용)."""
    result = await db.execute(
        text("""
            SELECT id, file_name, equipment_model, call_type,
                   symptoms, summary, excluded_by, excluded_at
            FROM consult_knowledge
            WHERE is_excluded = true
            ORDER BY excluded_at DESC
            LIMIT 200
        """)
    )
    rows = result.fetchall()
    return {
        "total": len(rows),
        "items": [
            {
                "id": str(r.id),
                "file_name": r.file_name,
                "equipment_model": r.equipment_model,
                "call_type": r.call_type,
                "symptoms": r.symptoms,
                "summary": r.summary,
                "excluded_by": r.excluded_by,
                "excluded_at": r.excluded_at.isoformat() if r.excluded_at else None,
            }
            for r in rows
        ]
    }

@router.post("/", status_code=201)
async def create_or_update_counsel(
    counsel: CounselCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """상담 이력 실제 DB 저장 (consult_logs) 및 감사 로그(audit_log_minimal) 기록 (신규 생성 또는 기존 진행중 상담 갱신)"""
    target_id = None
    if counsel.id:
        try:
            target_id = uuid.UUID(counsel.id)
        except ValueError:
            target_id = uuid.uuid4()
    else:
        target_id = uuid.uuid4()
    
    # 상담원 ID 매핑
    emp_id = None
    if counsel.counselor_name:
        emp_res = await db.execute(
            text("SELECT id FROM employees WHERE name = :name LIMIT 1"),
            {"name": counsel.counselor_name.strip()}
        )
        emp_row = emp_res.fetchone()
        if emp_row:
            emp_id = emp_row.id

    # action에 세션 스냅샷을 포함하여 완벽한 상태 복원 지원
    action_payload = counsel.action_taken
    if counsel.session_snapshot:
        full_payload = {
            "summary_text": counsel.action_taken,
            "session_snapshot": counsel.session_snapshot
        }
        action_payload = json.dumps(full_payload, ensure_ascii=False)

    # 기존 레코드 존재 여부 확인 (진행중 상담 갱신 지원)
    chk_res = await db.execute(text("SELECT id FROM consult_logs WHERE id = :id"), {"id": target_id})
    existing = chk_res.fetchone()

    if existing:
        update_query = text("""
            UPDATE consult_logs
            SET customer_name = :cname,
                manager = :mgr,
                serial_number = :snum,
                model_name = :model,
                keyword = :kw,
                symptom = :symptom,
                action = :action,
                is_completed = :is_comp,
                receiver_id = COALESCE(:emp_id, receiver_id),
                is_visit_required = :is_visit,
                timestamp = CURRENT_TIMESTAMP
            WHERE id = :id
            RETURNING id
        """)
        res = await db.execute(update_query, {
            "id": target_id,
            "cname": counsel.customer_name or "일반 고객",
            "mgr": counsel.manager or "",
            "snum": counsel.serial_number or "",
            "model": counsel.model_name or "",
            "kw": counsel.keyword or counsel.part_code or "셀프조치",
            "symptom": counsel.symptoms,
            "action": action_payload,
            "is_comp": counsel.is_completed,
            "emp_id": emp_id,
            "is_visit": counsel.is_visit_required
        })
        saved_id = res.scalar()
        action_name = 'UPDATE_COUNSEL'
    else:
        insert_query = text("""
            INSERT INTO consult_logs (
                id, customer_name, manager, serial_number, model_name,
                keyword, symptom, action, is_completed, receiver_id, is_visit_required, timestamp
            )
            VALUES (
                :id, :cname, :mgr, :snum, :model,
                :kw, :symptom, :action, :is_comp, :emp_id, :is_visit, CURRENT_TIMESTAMP
            )
            RETURNING id
        """)
        res = await db.execute(insert_query, {
            "id": target_id,
            "cname": counsel.customer_name or "일반 고객",
            "mgr": counsel.manager or "",
            "snum": counsel.serial_number or "",
            "model": counsel.model_name or "",
            "kw": counsel.keyword or counsel.part_code or "셀프조치",
            "symptom": counsel.symptoms,
            "action": action_payload,
            "is_comp": counsel.is_completed,
            "emp_id": emp_id,
            "is_visit": counsel.is_visit_required
        })
        saved_id = res.scalar()
        action_name = 'INSERT_COUNSEL'

    # 감사 로그 기록 (헌장 1.2, 5.2 무누락 저장)
    audit_q = text("""
        INSERT INTO audit_log_minimal (id, table_name, record_id, action, changed_by, changed_at)
        VALUES (:aid, 'consult_logs', :rid, :action_name, :emp_id, CURRENT_TIMESTAMP)
    """)
    await db.execute(audit_q, {"aid": uuid.uuid4(), "rid": saved_id, "action_name": action_name, "emp_id": emp_id})
    await db.commit()

    return {
        "id": str(saved_id),
        "status": "COMPLETED" if counsel.is_completed else "IN_PROGRESS",
        "message": "상담 데이터가 DB에 정상 저장되었습니다."
    }


@router.get("/pending", dependencies=[Depends(check_rate_limit)])
async def get_pending_counsels(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """진행 중(미완결/고객 확인 대기) 상담 목록 조회"""
    query = text("""
        SELECT id, timestamp, customer_name, manager, serial_number, model_name,
               keyword, symptom, action, is_completed, is_visit_required
        FROM consult_logs
        WHERE is_completed = false
        ORDER BY timestamp DESC
        LIMIT 50
    """)
    res = await db.execute(query)
    rows = res.fetchall()
    items = []
    for r in rows:
        snapshot = None
        action_text = r.action or ""
        if action_text.strip().startswith("{") and action_text.strip().endswith("}"):
            try:
                parsed = json.loads(action_text)
                snapshot = parsed.get("session_snapshot")
                action_text = parsed.get("summary_text", action_text)
            except Exception:
                pass
        items.append({
            "id": str(r.id),
            "timestamp": r.timestamp.isoformat() if r.timestamp else None,
            "customer_name": r.customer_name or "일반 고객",
            "manager": r.manager or "",
            "serial_number": r.serial_number or "",
            "model_name": r.model_name or "",
            "keyword": r.keyword or "",
            "symptom": r.symptom or "",
            "action": action_text,
            "is_completed": r.is_completed,
            "is_visit_required": r.is_visit_required,
            "session_snapshot": snapshot
        })
    return {"status": "success", "total": len(items), "items": items}


@router.get("/history", dependencies=[Depends(check_rate_limit)])
async def get_counsel_history(
    limit: int = 50,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """상담 이력 전체 조회 (진행중 / 해결 / 출장접수)"""
    where_cond = ""
    if status == "in_progress":
        where_cond = "WHERE is_completed = false"
    elif status == "resolved":
        where_cond = "WHERE is_completed = true AND is_visit_required = false"
    elif status == "visit":
        where_cond = "WHERE is_completed = true AND is_visit_required = true"

    query = text(f"""
        SELECT id, timestamp, customer_name, manager, serial_number, model_name,
               keyword, symptom, action, is_completed, is_visit_required
        FROM consult_logs
        {where_cond}
        ORDER BY timestamp DESC
        LIMIT :lim
    """)
    res = await db.execute(query, {"lim": limit})
    rows = res.fetchall()
    items = []
    for r in rows:
        snapshot = None
        action_text = r.action or ""
        if action_text.strip().startswith("{") and action_text.strip().endswith("}"):
            try:
                parsed = json.loads(action_text)
                snapshot = parsed.get("session_snapshot")
                action_text = parsed.get("summary_text", action_text)
            except Exception:
                pass
        items.append({
            "id": str(r.id),
            "timestamp": r.timestamp.isoformat() if r.timestamp else None,
            "customer_name": r.customer_name or "일반 고객",
            "manager": r.manager or "",
            "serial_number": r.serial_number or "",
            "model_name": r.model_name or "",
            "keyword": r.keyword or "",
            "symptom": r.symptom or "",
            "action": action_text,
            "is_completed": r.is_completed,
            "is_visit_required": r.is_visit_required,
            "session_snapshot": snapshot
        })
    return {"status": "success", "total": len(items), "items": items}


@router.delete("/session/{session_id}", dependencies=[Depends(check_rate_limit)])
async def delete_counsel_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """진행 중 상담 취소 및 영구 삭제"""
    await db.execute(text("DELETE FROM consult_logs WHERE id = :id"), {"id": str(session_id)})
    await db.commit()
    return {"status": "success", "id": str(session_id), "message": "상담 세션이 삭제되었습니다."}



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


# ─────────────────────────────────────────────────────────────
# 16대 전사 표준 장애 유형 체계 (Canonical Failure Types) 연동
# ─────────────────────────────────────────────────────────────
from .canonical_symptoms import (
    AVAILABLE_MODELS,
    CANONICAL_FAILURE_TYPES,
    OFFICIAL_12_ERROR_CODES,
    MODEL_SPECIFICATIONS,
    SPECIAL_MANUAL_GUIDES,
    resolve_symptoms_for_model,
    get_model_spec,
    get_special_guides,
    get_model_error_codes
)


@router.get("/official-error-codes")
async def get_official_error_codes(model: Optional[str] = None):
    """제조사((주)스페이스) 공식 모델별 계기판 에러 코드 및 원클릭 즉시 판정 기준 반환"""
    target = (model or "전체").strip()
    codes = get_model_error_codes(target)
    return {
        "status": "success",
        "model": target,
        "total": len(codes),
        "codes": codes
    }


@router.get("/model-symptoms")
async def get_model_symptoms(model: Optional[str] = None):
    """장비 모델별 표준 16대 장애 유형 및 대응 조치 목록 반환 (모델 특화 부품/매뉴얼/스펙/에러코드 자동 바인딩)"""
    target = (model or "전체").strip()
    symptoms = resolve_symptoms_for_model(target)
    spec = get_model_spec(target)
    codes = get_model_error_codes(target)
    
    return {
        "model": target,
        "symptoms": symptoms,
        "error_codes": codes,
        "models": AVAILABLE_MODELS,
        "model_spec": spec,
        "special_guides": get_special_guides(),
        "total": len(symptoms)
    }


@router.get("/model-spec")
async def get_model_specification(model: Optional[str] = None):
    """제조사 매뉴얼 기반 모델별 하드웨어 정밀 제원 및 소모품 규격 반환"""
    spec = get_model_spec(model)
    return {
        "status": "success",
        "model": model,
        "spec": spec,
        "all_specs": MODEL_SPECIFICATIONS
    }


@router.get("/special-guides")
async def get_special_manual_guides():
    """상황별 매뉴얼 긴급/수칙 가이드(브러시 자동착탈, 소포제, 동파방지, 비상견인) 반환"""
    return {
        "status": "success",
        "total": len(SPECIAL_MANUAL_GUIDES),
        "guides": get_special_guides()
    }



# ─────────────────────────────────────────────────────────────
# KB 복합 검색: OpenAI 벡터 우선 → bge 폴백 → ILIKE 폴백 + 룰 기반
# POST /api/v1/counsel/kb-search
# ─────────────────────────────────────────────────────────────
class KbSearchRequest(BaseModel):
    text: str
    limit: int = 5
    equipment_model: Optional[str] = None


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


@router.post("/kb-search", dependencies=[Depends(check_rate_limit)])
async def kb_search(
    req: KbSearchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    증상 텍스트 KB 복합 검색:
    1) OpenAI 1536차원 벡터 검색 (우선) → bge-m3 1024차원 (폴백) → ILIKE/pg_trgm (최종폴백)
    2) symptom_rules: pg_trgm 룰 기반 매칭
    3) 부정적 상태표현 ([OOO 안됨/불가/파손/깨짐/부서짐/빠짐/뽑힘]) 대상 명사 추출 병행
    """
    query_text = _normalize_domain_query(req.text)
    if not query_text:
        raise HTTPException(status_code=400, detail="검색 텍스트가 비어 있습니다.")

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
        vec_limit = req.limit * 3 if req.equipment_model else req.limit
        vec_sql   = text(f"""
            SELECT id, summary, equipment_model, symptoms,
                   parts_mentioned, action_items, urgency, similarity
            FROM {match_fn}(CAST(:vec AS vector({vec_dim})), :lim, '증상수리')
        """)
        vec_res  = await db.execute(vec_sql, {"vec": vec_str, "lim": vec_limit})
        vec_rows = vec_res.fetchall()

        # 장비 모델 필터 후처리
        if req.equipment_model:
            eq_lower = req.equipment_model.lower()
            vec_rows = [
                r for r in vec_rows
                if r.equipment_model and eq_lower in r.equipment_model.lower()
            ][:req.limit]

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
        eq_cond = "AND equipment_model ILIKE :eq" if req.equipment_model else ""
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
            FROM consult_knowledge
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
        params: dict = {"q": query_text, "q_raw": query_text, "q_target": target_hint, "lim": req.limit}
        if req.equipment_model:
            params["eq"] = f"%{req.equipment_model}%"

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
        FROM symptom_rules
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



# ─────────────────────────────────────────────────────────────
# 이중 엔진 임베딩 비교 검색
# POST /api/v1/counsel/kb-compare
# ─────────────────────────────────────────────────────────────
class KbCompareRequest(BaseModel):
    text: str
    limit: int = 5


@router.post("/kb-compare", dependencies=[Depends(check_rate_limit)])
async def kb_compare(
    req: KbCompareRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    동일 쿼리를 nomic(768) / OpenAI(1536) 두 엔진으로 검색하여 나란히 반환.
    embedding_nomic / embedding_openai 컬럼이 없는 경우 graceful 처리.
    """
    query_text = req.text.strip()
    if not query_text:
        raise HTTPException(status_code=400, detail="검색 텍스트가 비어 있습니다.")

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
            f"SELECT COUNT(*) FROM consult_knowledge WHERE {local_col} IS NOT NULL"
        ))
        local_count = r.scalar() or 0

    # ── openai 카운트 ────────────────────────────────────────────
    openai_count = 0
    if openai_col:
        r = await db.execute(text(
            f"SELECT COUNT(*) FROM consult_knowledge WHERE {openai_col} IS NOT NULL"
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
                    {"vec": vec_str, "lim": req.limit}
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
                FROM consult_knowledge
                WHERE call_type='증상수리' AND is_excluded=false AND {local_col} IS NOT NULL
                  AND (summary ILIKE '%'||:qr||'%' OR array_to_string(symptoms,' ') ILIKE '%'||:qr||'%')
                ORDER BY sim DESC LIMIT :lim
            """), {"q": query_text, "qr": query_text, "lim": req.limit})
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
                    {"vec": vec_str, "lim": req.limit}
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
                FROM consult_knowledge
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
            or_ = await db.execute(openai_sql, {"q": query_text, "qr": query_text, "lim": req.limit})
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

