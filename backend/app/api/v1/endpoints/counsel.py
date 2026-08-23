import json
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
import httpx
import os

from app.core.database import get_db

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
    """Ollama를 사용하여 분류 (로컬 LLaMA3 등)"""
    OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
    prompt = f"""다음 고객의 상담 내용을 분석하여 가장 적절한 부품코드와 키워드를 추출하세요.
가능한 부품코드: SALES_INQUIRY, SCHEDULE_DELIVERY, SUCTION, POWER, DRIVE_BRUSH, WATER_SOLENOID, CHASSIS, WATER_NO_FLOW, BRUSH_WIRE, BRUSH_COVER, FORWARD_FAIL, WATER_SUPPLY_FAIL, BRUSH_FAIL, CHARGER_FAIL, POWER_FAIL, CHARGE_INDICATOR, INQUIRY_ETC, IRRELEVANT

상담내용: "{user_text}"

결과를 반드시 아래 JSON 형식으로만 응답하세요. 다른 설명은 포함하지 마세요.
{{"keyword": "가장 핵심적인 증상 키워드", "part_code": "위 목록 중 하나"}}
"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(OLLAMA_URL, json={
                "model": "llama3",
                "prompt": prompt,
                "stream": False,
                "format": "json"
            })
            if res.status_code == 200:
                data = res.json().get("response", "{}")
                parsed = json.loads(data)
                
                # LLM 성공 로그 기록
                log_q = text("""
                    INSERT INTO llm_logs (prompt, response, model_used, inference_time_ms)
                    VALUES (:prompt, :response, 'llama3', :time_ms)
                """)
                await db.execute(log_q, {
                    "prompt": user_text, 
                    "response": json.dumps(parsed, ensure_ascii=False),
                    "time_ms": res.elapsed.total_seconds() * 1000 if hasattr(res, 'elapsed') else 0
                })
                await db.commit()

                return {
                    "keyword": parsed.get("keyword", "기타"),
                    "part_code": parsed.get("part_code", "INQUIRY_ETC")
                }
    except Exception as e:
        logger.error(f"LLM Fallback failed: {e}")
        # LLM 실패 로그 기록
        log_q = text("""
            INSERT INTO llm_logs (prompt, response, model_used, inference_time_ms, error_message)
            VALUES (:prompt, NULL, 'llama3', 0, :err)
        """)
        await db.execute(log_q, {"prompt": user_text, "err": str(e)})
        await db.commit()
    
    return {"keyword": "분류 불가", "part_code": "INQUIRY_ETC"}

@router.post("/classify", response_model=ClassifyResponse)
async def classify_text(req: ClassifyRequest, db: AsyncSession = Depends(get_db)):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    # 1. pg_trgm을 사용한 유사도 검색 (symptom_rules)
    query = text("""
        SELECT keyword, part_code, action_script, similarity(keyword, :text) as sim
        FROM symptom_rules
        WHERE is_active = true AND similarity(keyword, :text) > 0.3
        ORDER BY sim DESC, priority DESC, source_count DESC
        LIMIT 1
    """)
    
    result = await db.execute(query, {"text": req.text})
    row = result.fetchone()

    if row:
        try:
            action_script = json.loads(row.action_script) if isinstance(row.action_script, str) else row.action_script
        except:
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
    if fb_row:
        try:
            action_script = json.loads(fb_row.action_script) if isinstance(fb_row.action_script, str) else fb_row.action_script
        except:
            pass

    return ClassifyResponse(
        keyword=llm_res["keyword"],
        part_code=llm_res["part_code"],
        action_script=action_script,
        source="llm_fallback",
        confidence=0.5
    )

class CounselCreate(BaseModel):
    customer_id: str
    symptoms: str
    part_code: str
    action_taken: str

@router.post("/")
async def create_counsel(counsel: CounselCreate, db: AsyncSession = Depends(get_db)):
    # 상담 이력 저장 로직 (counsel_history 테이블)
    query = text("""
        INSERT INTO counsel_history (customer_id, symptoms, part_code, action_taken, status)
        VALUES (:cid, :symptoms, :pcode, :action, 'COMPLETED')
        RETURNING id
    """)
    res = await db.execute(query, {
        "cid": counsel.customer_id,
        "symptoms": counsel.symptoms,
        "pcode": counsel.part_code,
        "action": counsel.action_taken
    })
    await db.commit()
    return {"id": res.scalar(), "message": "Counsel saved successfully"}
