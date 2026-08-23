import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
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
async def list_parts(
    db: AsyncSession = Depends(get_db),
    limit: int = Query(100, ge=1, le=500, description="조회 제한 수"),
    offset: int = Query(0, ge=0, description="조회 오프셋"),
    search: Optional[str] = Query(None, description="부품명 검색")
):
    """부품 목록 및 재고 수량 조회 (페이지네이션 적용)"""
    if search:
        query = text("""
            SELECT id, name, compatible_models, unit_price, stock, note
            FROM parts
            WHERE name ILIKE :search
            ORDER BY name ASC
            LIMIT :limit OFFSET :offset
        """)
        result = await db.execute(query, {"search": f"%{search}%", "limit": limit, "offset": offset})
    else:
        query = text("""
            SELECT id, name, compatible_models, unit_price, stock, note
            FROM parts
            ORDER BY name ASC
            LIMIT :limit OFFSET :offset
        """)
        result = await db.execute(query, {"limit": limit, "offset": offset})
    
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

