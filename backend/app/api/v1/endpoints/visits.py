import logging
import uuid
from typing import List, Optional, Literal
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel

from app.core.database import get_db
from app.services.notification import get_notification_service

router = APIRouter()
logger = logging.getLogger(__name__)

from pydantic import BaseModel, Field

class VisitCreate(BaseModel):
    customer_id: Optional[str] = None
    customer_name: str
    manager: Optional[str] = None
    phone: str = Field(..., pattern=r"^\d{2,3}-\d{3,4}-\d{4}$", description="전화번호 형식: 010-1234-5678")
    address: str
    address_detail: Optional[str] = ""
    request_note: Optional[str] = ""
    assigned_engineer: Optional[str] = None
    dispatch_date: Optional[str] = None
    consult_id: Optional[str] = None
    client_type: Optional[str] = "desktop"

class VisitPartCreate(BaseModel):
    part_id: str
    quantity: int = Field(1, gt=0, description="사용 수량 (1 이상 필수)")
    engineer_name: Optional[str] = None

class VisitStatusUpdate(BaseModel):
    status: Literal["접수", "진행중", "완료", "취소", "재방문"]
    changed_by_name: Optional[str] = "SYSTEM"
    client_type: Optional[str] = "mobile"
    note: Optional[str] = None

class VisitComplete(BaseModel):
    engineer_name: str
    work_summary: str
    phone: str
    customer_name: str
    signature_data: Optional[str] = None
    completed_at: Optional[str] = None
    client_type: Optional[str] = "mobile"


class VisitResponse(BaseModel):
    id: str
    customer_name: Optional[str] = ""
    manager: Optional[str] = ""
    phone: Optional[str] = ""
    address: Optional[str] = ""
    address_detail: Optional[str] = ""
    request_note: Optional[str] = ""
    status: str
    timestamp: Optional[str] = ""

@router.get("/", response_model=List[VisitResponse])
async def list_visits(
    status: Optional[str] = Query(None, description="상태별 필터"),
    limit: int = Query(50, ge=1, le=100, description="조회 제한 수"),
    offset: int = Query(0, ge=0, description="조회 오프셋"),
    db: AsyncSession = Depends(get_db)
):
    """출장 목록 조회 (페이지네이션 적용)"""
    if status:
        query = text("""
            SELECT id, customer_name, manager, phone, address, address_detail, request_note, status, timestamp
            FROM visits
            WHERE status = :status
            ORDER BY timestamp DESC
            LIMIT :limit OFFSET :offset
        """)
        result = await db.execute(query, {"status": status, "limit": limit, "offset": offset})
    else:
        query = text("""
            SELECT id, customer_name, manager, phone, address, address_detail, request_note, status, timestamp
            FROM visits
            ORDER BY timestamp DESC
            LIMIT :limit OFFSET :offset
        """)
        result = await db.execute(query, {"limit": limit, "offset": offset})

    rows = result.fetchall()
    return [
        VisitResponse(
            id=str(r.id),
            customer_name=r.customer_name or "",
            manager=r.manager or "",
            phone=r.phone or "",
            address=r.address or "",
            address_detail=r.address_detail or "",
            request_note=r.request_note or "",
            status=r.status,
            timestamp=r.timestamp.isoformat() if r.timestamp else ""
        )
        for r in rows
    ]

@router.get("/{visit_id}")
async def get_visit_detail(visit_id: str, db: AsyncSession = Depends(get_db)):
    """출장 단건 상세 및 사용 부품 내역 조회"""
    query = text("""
        SELECT v.id, v.customer_name, v.manager, v.phone, v.address, v.address_detail, 
               v.request_note, v.status, v.timestamp, v.note
        FROM visits v
        WHERE v.id = :vid
    """)
    result = await db.execute(query, {"vid": visit_id})
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Visit record not found")

    # 사용 부품 조회
    parts_query = text("""
        SELECT vp.id, vp.quantity, vp.timestamp, p.name as part_name, p.unit_price
        FROM visit_parts vp
        JOIN parts p ON vp.part_id = p.id
        WHERE vp.visit_id = :vid
    """)
    parts_res = await db.execute(parts_query, {"vid": visit_id})
    parts_rows = parts_res.fetchall()

    return {
        "visit": {
            "id": str(row.id),
            "customer_name": row.customer_name,
            "manager": row.manager,
            "phone": row.phone,
            "address": row.address,
            "address_detail": row.address_detail,
            "request_note": row.request_note,
            "status": row.status,
            "note": row.note,
            "timestamp": row.timestamp.isoformat() if row.timestamp else ""
        },
        "used_parts": [
            {
                "id": str(pr.id),
                "part_name": pr.part_name,
                "quantity": pr.quantity,
                "unit_price": pr.unit_price,
                "timestamp": pr.timestamp.isoformat() if pr.timestamp else ""
            }
            for pr in parts_rows
        ]
    }

@router.post("/")
async def create_visit(req: VisitCreate, db: AsyncSession = Depends(get_db)):
    """출장 접수 생성 및 이력 기록"""
    new_id = uuid.uuid4()
    
    # 기사 및 방문일정 메타데이터 보존
    combined_note = req.request_note or ""
    if req.assigned_engineer or req.dispatch_date:
        meta_prefix = f"[배정: {req.assigned_engineer or '미지정'} / 희망일시: {req.dispatch_date or '협의'}] "
        if not combined_note.startswith("[배정:"):
            combined_note = meta_prefix + combined_note

    # 담당 정비사 ID 매핑 조회
    emp_id = None
    if req.assigned_engineer:
        emp_res = await db.execute(
            text("SELECT id FROM employees WHERE name = :name LIMIT 1"),
            {"name": req.assigned_engineer.replace(" 정비기사", "").strip()}
        )
        emp_row = emp_res.fetchone()
        if emp_row:
            emp_id = emp_row.id

    query = text("""
        INSERT INTO visits (id, customer_id, consult_id, customer_name, manager, phone, address, address_detail, employee_id, request_note, status, timestamp)
        VALUES (:id, :cid, :consult_id, :cname, :manager, :phone, :addr, :addr_det, :emp_id, :note, '접수', CURRENT_TIMESTAMP)
        RETURNING id
    """)
    cid_val = req.customer_id if req.customer_id and req.customer_id.strip() else None
    try:
        consult_id_val = uuid.UUID(req.consult_id) if req.consult_id and req.consult_id.strip() else None
    except ValueError:
        raise HTTPException(status_code=400, detail="consult_id 형식이 올바르지 않습니다 (UUID 형식 필요)")

    res = await db.execute(query, {
        "id": new_id,
        "cid": cid_val,
        "consult_id": consult_id_val,
        "cname": req.customer_name,
        "manager": req.manager,
        "phone": req.phone,
        "addr": req.address,
        "addr_det": req.address_detail,
        "emp_id": emp_id,
        "note": combined_note
    })
    visit_id = res.scalar()
    
    # 상태 변경 이력 테이블 무누락 기록
    history_query = text("""
        INSERT INTO visit_status_history (id, visit_id, old_status, new_status, changed_by, client_type, changed_at)
        VALUES (:hid, :vid, NULL, '접수', :emp_id, :client_type, CURRENT_TIMESTAMP)
    """)
    await db.execute(history_query, {
        "hid": uuid.uuid4(),
        "vid": visit_id,
        "emp_id": emp_id,
        "client_type": req.client_type or "desktop"
    })
    
    # 감사 로그(audit_log_minimal) 기록
    audit_query = text("""
        INSERT INTO audit_log_minimal (id, table_name, record_id, action, changed_by, changed_at)
        VALUES (:aid, 'visits', :rid, 'INSERT', :emp_id, CURRENT_TIMESTAMP)
    """)
    await db.execute(audit_query, {"aid": uuid.uuid4(), "rid": visit_id, "emp_id": emp_id})

    await db.commit()

    # 알림톡 발송 (접수 확인)
    notifier = get_notification_service()
    try:
        visit_date_str = req.dispatch_date or datetime.now().strftime("%Y-%m-%d %H:%M")
        await notifier.send_visit_accepted(
            phone=req.phone,
            customer_name=req.customer_name,
            visit_date=visit_date_str,
            contact=req.phone or "1588-0000"
        )
    except Exception as e:
        logger.error(f"Notification trigger failed: {e}")

    return {"visit_id": str(visit_id), "status": "접수", "message": "출장 접수 완료"}

@router.patch("/{visit_id}/status")
async def update_visit_status(visit_id: str, req: VisitStatusUpdate, db: AsyncSession = Depends(get_db)):
    """출장 상태 변경 및 이력/감사 로그 기록"""
    # 1. 이전 상태 조회
    chk_q = text("SELECT status FROM visits WHERE id = :vid")
    chk_res = await db.execute(chk_q, {"vid": visit_id})
    row = chk_res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Visit not found")
    old_status = row.status

    # 2. 담당자 ID 조회 (changed_by 매핑)
    emp_id = None
    if req.changed_by_name:
        emp_res = await db.execute(
            text("SELECT id FROM employees WHERE name = :name LIMIT 1"),
            {"name": req.changed_by_name.replace(" 정비기사", "").strip()}
        )
        emp_row = emp_res.fetchone()
        if emp_row:
            emp_id = emp_row.id

    # 3. 상태 업데이트
    upd_q = text("""
        UPDATE visits 
        SET status = :new_status, note = COALESCE(:note, note)
        WHERE id = :vid
    """)
    await db.execute(upd_q, {"new_status": req.status, "note": req.note, "vid": visit_id})

    # 4. 이력 기록 (changed_by 무누락 바인딩)
    hist_q = text("""
        INSERT INTO visit_status_history (id, visit_id, old_status, new_status, changed_by, client_type, changed_at)
        VALUES (:hid, :vid, :old_status, :new_status, :emp_id, :client_type, CURRENT_TIMESTAMP)
    """)
    await db.execute(hist_q, {
        "hid": uuid.uuid4(),
        "vid": visit_id,
        "old_status": old_status,
        "new_status": req.status,
        "emp_id": emp_id,
        "client_type": req.client_type or "mobile"
    })

    # 5. 감사 로그 (changed_by 무누락 바인딩)
    audit_q = text("""
        INSERT INTO audit_log_minimal (id, table_name, record_id, action, changed_by, changed_at)
        VALUES (:aid, 'visits', :rid, 'UPDATE_STATUS', :emp_id, CURRENT_TIMESTAMP)
    """)
    await db.execute(audit_q, {"aid": uuid.uuid4(), "rid": visit_id, "emp_id": emp_id})

    await db.commit()
    return {"visit_id": visit_id, "old_status": old_status, "new_status": req.status}

@router.post("/{visit_id}/parts")
async def add_visit_parts(visit_id: str, req: VisitPartCreate, db: AsyncSession = Depends(get_db)):
    """현장 출장 사용 부품 등록 및 재고(stock) 자동 차감 트랜잭션"""
    # 1. 부품 재고 확인
    stock_q = text("SELECT stock, name FROM parts WHERE id = :pid FOR UPDATE")
    stock_res = await db.execute(stock_q, {"pid": req.part_id})
    part_row = stock_res.fetchone()
    if not part_row:
        raise HTTPException(status_code=404, detail="Part not found")
    
    if (part_row.stock or 0) < req.quantity:
        raise HTTPException(
            status_code=400, 
            detail=f"재고 부족: 현재고 {part_row.stock or 0}개, 요청 {req.quantity}개"
        )

    emp_id = None
    if req.engineer_name:
        emp_res = await db.execute(
            text("SELECT id FROM employees WHERE name = :name LIMIT 1"),
            {"name": req.engineer_name.replace(" 정비기사", "").strip()}
        )
        emp_row = emp_res.fetchone()
        if emp_row:
            emp_id = emp_row.id

    # 2. visit_parts 등록
    vp_id = uuid.uuid4()
    vp_q = text("""
        INSERT INTO visit_parts (id, visit_id, part_id, quantity, timestamp)
        VALUES (:id, :vid, :pid, :qty, CURRENT_TIMESTAMP)
    """)
    await db.execute(vp_q, {
        "id": vp_id,
        "vid": visit_id,
        "pid": req.part_id,
        "qty": req.quantity
    })

    # 3. parts 재고 차감
    dec_q = text("""
        UPDATE parts 
        SET stock = stock - :qty 
        WHERE id = :pid
    """)
    await db.execute(dec_q, {"qty": req.quantity, "pid": req.part_id})

    # 4. 감사 로그 2건 기록 (visit_parts 신규 생성 + parts 재고 차감)
    audit_vp = text("""
        INSERT INTO audit_log_minimal (id, table_name, record_id, action, changed_by, changed_at)
        VALUES (:aid, 'visit_parts', :rid, 'INSERT_VISIT_PART', :emp_id, CURRENT_TIMESTAMP)
    """)
    await db.execute(audit_vp, {"aid": uuid.uuid4(), "rid": vp_id, "emp_id": emp_id})

    audit_parts = text("""
        INSERT INTO audit_log_minimal (id, table_name, record_id, action, changed_by, changed_at)
        VALUES (:aid, 'parts', :pid, 'DEDUCT_STOCK', :emp_id, CURRENT_TIMESTAMP)
    """)
    await db.execute(audit_parts, {"aid": uuid.uuid4(), "pid": req.part_id, "emp_id": emp_id})

    await db.commit()
    return {
        "message": f"부품 '{part_row.name}' {req.quantity}개 사용 등록 및 재고 차감 완료",
        "visit_id": visit_id,
        "part_id": req.part_id,
        "used_quantity": req.quantity,
        "remaining_stock": (part_row.stock or 0) - req.quantity
    }

@router.post("/{visit_id}/complete")
async def complete_visit(visit_id: str, req: VisitComplete, db: AsyncSession = Depends(get_db)):
    """출장 완료 처리 및 고객 완료 알림톡 발송 (실제 이전 상태 및 정비사 ID 바인딩)"""
    # 1. 실제 현재 상태 조회 및 404 엄격 검증
    chk_q = text("SELECT status FROM visits WHERE id = :vid")
    chk_res = await db.execute(chk_q, {"vid": visit_id})
    row = chk_res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="존재하지 않는 출장 건입니다.")
    old_status = row.status

    # 정비사 ID 매핑
    emp_id = None
    if req.engineer_name:
        emp_res = await db.execute(
            text("SELECT id FROM employees WHERE name = :name LIMIT 1"),
            {"name": req.engineer_name.replace(" 정비기사", "").strip()}
        )
        emp_row = emp_res.fetchone()
        if emp_row:
            emp_id = emp_row.id

    # 2. 상태 '완료' 및 서명/메모 업데이트
    note_text = req.work_summary
    if req.signature_data:
        note_text += " [고객 서명 확인 완료]"
    upd_q = text("""
        UPDATE visits 
        SET status = '완료', note = COALESCE(:note, note)
        WHERE id = :vid
    """)
    await db.execute(upd_q, {"note": note_text, "vid": visit_id})

    # 3. 상태 이력 기록 (실제 old_status 및 changed_by 보존)
    hist_q = text("""
        INSERT INTO visit_status_history (id, visit_id, old_status, new_status, changed_by, client_type, changed_at)
        VALUES (:hid, :vid, :old_status, '완료', :emp_id, :client_type, CURRENT_TIMESTAMP)
    """)
    await db.execute(hist_q, {
        "hid": uuid.uuid4(),
        "vid": visit_id,
        "old_status": old_status,
        "emp_id": emp_id,
        "client_type": req.client_type or "mobile"
    })

    # 4. 감사 로그
    audit_q = text("""
        INSERT INTO audit_log_minimal (id, table_name, record_id, action, changed_by, changed_at)
        VALUES (:aid, 'visits', :rid, 'COMPLETE', :emp_id, CURRENT_TIMESTAMP)
    """)
    await db.execute(audit_q, {"aid": uuid.uuid4(), "rid": visit_id, "emp_id": emp_id})

    await db.commit()

    # 5. 알림톡 발송
    completed_time = req.completed_at or datetime.now().strftime("%Y-%m-%d %H:%M")
    notifier = get_notification_service()
    try:
        await notifier.send_completion(
            phone=req.phone,
            customer_name=req.customer_name,
            engineer_name=req.engineer_name,
            completed_at=completed_time,
            work_summary=req.work_summary
        )
    except Exception as e:
        logger.error(f"Notification error: {e}")

    return {"message": "출장 완료 처리 및 알림톡 발송 완료", "visit_id": visit_id, "old_status": old_status}
