"""이관센터(transfer_centers) CRUD API"""
import uuid
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel

from app.core.database import get_db

router = APIRouter()
logger = logging.getLogger(__name__)


class TransferCenterCreate(BaseModel):
    name: str
    address: Optional[str] = None


class TransferCenterResponse(BaseModel):
    id: str
    name: str
    address: Optional[str] = None


@router.get("/", response_model=List[TransferCenterResponse])
async def list_transfer_centers(db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("SELECT id, name, address FROM transfer_centers ORDER BY name"))
    rows = result.fetchall()
    return [TransferCenterResponse(id=str(r.id), name=r.name, address=r.address) for r in rows]


@router.post("/", response_model=TransferCenterResponse, status_code=201)
async def create_transfer_center(req: TransferCenterCreate, db: AsyncSession = Depends(get_db)):
    new_id = uuid.uuid4()
    result = await db.execute(
        text("INSERT INTO transfer_centers (id, name, address) VALUES (:id, :name, :address) RETURNING id, name, address"),
        {"id": new_id, "name": req.name, "address": req.address}
    )
    row = result.fetchone()
    await db.commit()
    return TransferCenterResponse(id=str(row.id), name=row.name, address=row.address)


@router.delete("/{center_id}", status_code=204)
async def delete_transfer_center(center_id: str, db: AsyncSession = Depends(get_db)):
    chk = await db.execute(text("SELECT id FROM transfer_centers WHERE id = :cid"), {"cid": center_id})
    if not chk.fetchone():
        raise HTTPException(status_code=404, detail="이관센터를 찾을 수 없습니다.")
    await db.execute(text("DELETE FROM transfer_centers WHERE id = :cid"), {"cid": center_id})
    await db.commit()
