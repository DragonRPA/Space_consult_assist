import json
import logging
import hashlib
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
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
    
    prompt = f"""다음 고객의 상담 내용을 분석하여 가장 적절한 부품코드와 키워드를 추출하세요.
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
                # 조기 커밋 제거: 상위 엔드포인트에서 트랜잭션 관리
                # await db.commit()  ← 제거됨

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
            # 조기 커밋 제거: 상위 엔드포인트에서 트랜잭션 관리
            # await db.commit()  ← 제거됨
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

    return ClassifyResponse(
        keyword=llm_res["keyword"],
        part_code=llm_res["part_code"],
        action_script=action_script,
        source="llm_fallback",
        confidence=0.5
    )

class CounselCreate(BaseModel):
    customer_id: Optional[str] = None
    customer_name: Optional[str] = "일반 고객"
    manager: Optional[str] = ""
    serial_number: Optional[str] = ""
    model_name: Optional[str] = ""
    keyword: Optional[str] = ""
    symptoms: str = Field(..., max_length=5000, description="증상 설명 (최대 5000자)")
    part_code: Optional[str] = ""
    action_taken: str = Field(..., max_length=5000, description="조치 내용 (최대 5000자)")
    is_completed: bool = True
    is_visit_required: bool = False
    counselor_name: Optional[str] = None

@router.post("/", status_code=201)
async def create_counsel(
    counsel: CounselCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """상담 이력 실제 DB 저장 (consult_logs) 및 감사 로그(audit_log_minimal) 기록"""
    new_id = uuid.uuid4()
    
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

    query = text("""
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
    res = await db.execute(query, {
        "id": new_id,
        "cname": counsel.customer_name or "일반 고객",
        "mgr": counsel.manager or "",
        "snum": counsel.serial_number or "",
        "model": counsel.model_name or "",
        "kw": counsel.keyword or counsel.part_code or "셀프조치",
        "symptom": counsel.symptoms,
        "action": counsel.action_taken,
        "is_comp": counsel.is_completed,
        "emp_id": emp_id,
        "is_visit": counsel.is_visit_required
    })
    saved_id = res.scalar()

    # 감사 로그 기록 (헌장 1.2, 5.2 무누락 저장 & changed_by 연동)
    audit_q = text("""
        INSERT INTO audit_log_minimal (id, table_name, record_id, action, changed_by, changed_at)
        VALUES (:aid, 'consult_logs', :rid, 'INSERT_COUNSEL', :emp_id, CURRENT_TIMESTAMP)
    """)
    await db.execute(audit_q, {"aid": uuid.uuid4(), "rid": saved_id, "emp_id": emp_id})

    await db.commit()
    return {"id": str(saved_id), "status": "COMPLETED", "message": "상담 및 셀프조치 이력이 DB에 정상 저장되었습니다."}

