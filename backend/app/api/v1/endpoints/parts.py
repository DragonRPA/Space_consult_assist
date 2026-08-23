import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
import uuid

from app.core.database import get_db

router = APIRouter()
logger = logging.getLogger(__name__)

class PartResponse(BaseModel):
    id: str
    name: str
    compatible_models: Optional[str] = None
    unit_price: Optional[int] = 0
    stock: int = 0
    note: Optional[str] = None

@router.get("/", response_model=List[PartResponse])
async def list_parts(db: AsyncSession = Depends(get_db)):
    """부품 목록 및 재고 수량 조회"""
    query = text("""
        SELECT id, name, compatible_models, unit_price, stock, note
        FROM parts
        ORDER BY name ASC
    """)
    result = await db.execute(query)
    rows = result.fetchall()
    return [
        PartResponse(
            id=str(r.id),
            name=r.name,
            compatible_models=r.compatible_models,
            unit_price=r.unit_price or 0,
            stock=r.stock or 0,
            note=r.note
        )
        for r in rows
    ]
