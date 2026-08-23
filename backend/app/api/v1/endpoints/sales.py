import logging
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel

from app.core.database import get_db

router = APIRouter()
logger = logging.getLogger(__name__)

class SalesInquiryCreate(BaseModel):
    inquiry_type: str = "견적/계약문의"
    customer_name: str
    manager: Optional[str] = ""
    manager_phone: str
    request_note: Optional[str] = ""
    client_type: Optional[str] = "desktop"

@router.post("/")
async def create_sales_inquiry(req: SalesInquiryCreate, db: AsyncSession = Depends(get_db)):
    """영업 문의 이관 접수 생성"""
    new_id = uuid.uuid4()
    query = text("""
        INSERT INTO sales_inquiries (id, inquiry_type, customer_name, manager, manager_phone, request_note, is_completed, client_type, timestamp)
        VALUES (:id, :itype, :cname, :mgr, :phone, :note, false, :client_type, CURRENT_TIMESTAMP)
        RETURNING id
    """)
    res = await db.execute(query, {
        "id": new_id,
        "itype": req.inquiry_type,
        "cname": req.customer_name,
        "mgr": req.manager,
        "phone": req.manager_phone,
        "note": req.request_note,
        "client_type": req.client_type or "desktop"
    })
    inquiry_id = res.scalar()

    # 감사 로그 기록
    audit_q = text("""
        INSERT INTO audit_log_minimal (id, table_name, record_id, action, changed_at)
        VALUES (:aid, 'sales_inquiries', :rid, 'INSERT', CURRENT_TIMESTAMP)
    """)
    await db.execute(audit_q, {"aid": uuid.uuid4(), "rid": inquiry_id})

    await db.commit()
    return {"inquiry_id": str(inquiry_id), "status": "접수", "message": "영업팀 이관 접수 완료"}
