import json
import re
import logging
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.security import check_rate_limit, get_current_user
from app.services.counsel_kb_service import (
    fallback_llm_classification,
    execute_kb_search,
    execute_kb_compare,
)

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
        FROM space_symptom_rules
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
        FROM space_symptom_rules 
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
            UPDATE space_consult_knowledge
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
            UPDATE space_consult_knowledge
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
            FROM space_consult_knowledge
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
            text("SELECT id FROM space_employees WHERE name = :name LIMIT 1"),
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
    chk_res = await db.execute(text("SELECT id FROM space_consult_logs WHERE id = :id"), {"id": target_id})
    existing = chk_res.fetchone()

    if existing:
        update_query = text("""
            UPDATE space_consult_logs
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
            INSERT INTO space_consult_logs (
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
        INSERT INTO space_audit_log_minimal (id, table_name, record_id, action, changed_by, changed_at)
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
        FROM space_consult_logs
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
        FROM space_consult_logs
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
    await db.execute(text("DELETE FROM space_consult_logs WHERE id = :id"), {"id": str(session_id)})
    await db.commit()
    return {"status": "success", "id": str(session_id), "message": "상담 세션이 삭제되었습니다."}




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
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="검색 텍스트가 비어 있습니다.")
    return await execute_kb_search(
        text_input=req.text,
        limit=req.limit,
        equipment_model=req.equipment_model,
        db=db,
    )


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
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="검색 텍스트가 비어 있습니다.")
    return await execute_kb_compare(
        text_input=req.text,
        limit=req.limit,
        db=db,
    )


# ─────────────────────────────────────────────────────────────
# 고객·담당자·주소·발신자 통합 조회 (customers + visits + consult_knowledge 2,345건)
# GET /api/v1/counsel/customer-lookup
# ─────────────────────────────────────────────────────────────
_CALLER_ID_PARSE_RE = re.compile(r"^([^\(]+)\((.+)\)$")


@router.get("/customer-lookup")
async def customer_lookup(
    q: str = "",
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
):
    """
    고객사명, 담당자명, 전화번호, 도로명/지번 주소, 상세위치, 또는 통화 녹취 발신자(caller_id 2,345건) 통합 검색
    """
    raw_q = (q or "").strip()
    if not raw_q:
        return {"query": "", "count": 0, "items": []}

    like_q = f"%{raw_q}%"
    items: list[dict] = []
    seen_keys: set[str] = set()

    # 1) customers 테이블 조회
    try:
        cust_sql = text("""
            SELECT id, name, manager, manager_phone, address, address_detail, use_company_name
            FROM space_customers
            WHERE name ILIKE :q
               OR manager ILIKE :q
               OR manager_phone ILIKE :q
               OR address ILIKE :q
               OR address_detail ILIKE :q
               OR use_company_name ILIKE :q
            LIMIT :lim
        """)
        cust_res = await db.execute(cust_sql, {"q": like_q, "lim": limit})
        for r in cust_res.fetchall():
            key = f"{r.name or ''}|{r.manager or ''}"
            if key not in seen_keys:
                seen_keys.add(key)
                items.append({
                    "id": str(r.id),
                    "name": r.name or "",
                    "manager": r.manager or "현장 담당자",
                    "phone": r.manager_phone or "",
                    "address": r.address or "",
                    "addressDetail": r.address_detail or "",
                    "useCompany": r.use_company_name or "",
                    "assetModel": "J600T",
                    "source": "customers",
                })
    except Exception as e:
        logger.warning(f"customers 조회 실패: {e}")

    # 2) visits (방문 점검/출장 이력) 테이블 조회
    try:
        visit_sql = text("""
            SELECT id, customer_name, manager, phone, address, address_detail, model_name
            FROM space_visits
            WHERE customer_name ILIKE :q
               OR manager ILIKE :q
               OR phone ILIKE :q
               OR address ILIKE :q
               OR address_detail ILIKE :q
            ORDER BY id DESC
            LIMIT :lim
        """)
        visit_res = await db.execute(visit_sql, {"q": like_q, "lim": limit})
        for r in visit_res.fetchall():
            key = f"{r.customer_name or ''}|{r.manager or ''}"
            if key not in seen_keys:
                seen_keys.add(key)
                items.append({
                    "id": f"visit-{r.id}",
                    "name": r.customer_name or "",
                    "manager": r.manager or "현장 담당자",
                    "phone": r.phone or "",
                    "address": r.address or "",
                    "addressDetail": r.address_detail or "",
                    "useCompany": "",
                    "assetModel": r.model_name or "J600T",
                    "source": "visits",
                })
    except Exception as e:
        logger.warning(f"visits 조회 실패: {e}")

    # 3) consult_knowledge.caller_id (실제 통화 녹취 발신자 2,345건 프로필) 조회
    try:
        ck_sql = text("""
            SELECT caller_id,
                   MAX(equipment_model) AS equipment_model,
                   MAX(summary) AS latest_summary,
                   COUNT(*) AS call_count
            FROM space_consult_knowledge
            WHERE caller_id IS NOT NULL
              AND caller_id ILIKE :q
            GROUP BY caller_id
            ORDER BY call_count DESC
            LIMIT :lim
        """)
        ck_res = await db.execute(ck_sql, {"q": like_q, "lim": limit})
        for r in ck_res.fetchall():
            cid = (r.caller_id or "").strip()
            if not cid:
                continue
            m = _CALLER_ID_PARSE_RE.match(cid)
            if m:
                mgr_part = m.group(1).replace("_", " ").strip()
                comp_part = m.group(2).replace("_", " ").strip()
            else:
                mgr_part = "현장 담당자"
                comp_part = cid.replace("_", " ").strip()

            key = f"{comp_part}|{mgr_part}"
            if key not in seen_keys:
                seen_keys.add(key)
                eq_model = r.equipment_model if (r.equipment_model and r.equipment_model != "null") else "J600T"
                items.append({
                    "id": f"ck-{len(items)}",
                    "name": comp_part,
                    "manager": mgr_part,
                    "phone": cid if re.match(r"^0\d{1,2}-?\d{3,4}-?\d{4}$", cid) else "",
                    "address": "",
                    "addressDetail": f"과거 상담 {r.call_count}건 이력 보유",
                    "useCompany": "",
                    "assetModel": eq_model,
                    "historyTimeline": [
                        {"date": "과거 통화 이력", "title": r.latest_summary or f"누적 {r.call_count}건 상담"}
                    ],
                    "source": "consult_knowledge",
                })
    except Exception as e:
        logger.warning(f"consult_knowledge caller_id 조회 실패: {e}")

    return {
        "query": raw_q,
        "count": len(items[:limit]),
        "items": items[:limit],
    }


