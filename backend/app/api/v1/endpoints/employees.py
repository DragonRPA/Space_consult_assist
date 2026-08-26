"""
Employees Endpoint: Dynamic Staff / Engineers list from DB
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
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

class EmployeeCreate(BaseModel):
    name: str
    phone: Optional[str] = None

@router.get("/", response_model=List[EmployeeItem])
async def list_employees(db: AsyncSession = Depends(get_db)):
    """DB에 등록된 정식 임직원 / 현장 기사 목록 동적 반환"""
    query = text("SELECT id, name, phone FROM employees ORDER BY name ASC")
    res = await db.execute(query)
    rows = res.fetchall()
    return [{"id": str(r.id), "name": r.name, "phone": r.phone} for r in rows]

@router.post("/", response_model=EmployeeItem, status_code=201)
async def create_employee(req: EmployeeCreate, db: AsyncSession = Depends(get_db)):
    """직원 등록 (이름 중복 시 기존 레코드 반환)"""
    # 중복 체크
    chk = await db.execute(
        text("SELECT id, name, phone FROM employees WHERE name = :name LIMIT 1"),
        {"name": req.name.strip()}
    )
    existing = chk.fetchone()
    if existing:
        return {"id": str(existing.id), "name": existing.name, "phone": existing.phone}

    new_id = uuid.uuid4()
    res = await db.execute(
        text("INSERT INTO employees (id, name, phone) VALUES (:id, :name, :phone) RETURNING id, name, phone"),
        {"id": new_id, "name": req.name.strip(), "phone": req.phone}
    )
    row = res.fetchone()
    await db.commit()
    return {"id": str(row.id), "name": row.name, "phone": row.phone}
