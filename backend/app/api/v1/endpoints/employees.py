"""
Employees Endpoint: Dynamic Staff / Engineers list from DB
"""

from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
import uuid

from app.core.database import get_db

router = APIRouter()

class EmployeeItem(BaseModel):
    id: str
    name: str
    phone: Optional[str] = None

@router.get("/", response_model=List[EmployeeItem])
async def list_employees(db: AsyncSession = Depends(get_db)):
    """DB에 등록된 정식 임직원 / 현장 기사 목록 동적 반환"""
    query = text("SELECT id, name, phone FROM employees ORDER BY name ASC")
    res = await db.execute(query)
    rows = res.fetchall()
    return [{"id": str(r.id), "name": r.name, "phone": r.phone} for r in rows]
