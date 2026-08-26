"""업무 일정(schedule_events) CRUD API

space-dust 캘린더의 Firebase 저장 구조를 우리 Supabase(PostgreSQL)로 완전 이식.
- 카테고리별 동적 extra 필드는 JSONB로 저장/복원
- 기간 필터, 카테고리 필터, 완료 필터 지원
- 생성/수정 시 updated_at 자동 갱신
- 감사 로그(audit_log_minimal) 무누락 기록
"""
import json
import logging
import uuid
from typing import List, Optional
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel, Field

from app.core.database import get_db

router = APIRouter()
logger = logging.getLogger(__name__)

VALID_CATEGORIES = {
    'sales-demo', 'equip-ship', 'part-ship',
    'rental-ship', 'as-service', 'purchase-check', 'maintenance',
    'other'
}


# ─── Pydantic 모델 ───────────────────────────────────────────────────────────

class ScheduleEventCreate(BaseModel):
    category: str = Field(..., description="업무카테고리 key")
    worktype: Optional[str] = None
    use_company: Optional[str] = None
    contract_company: Optional[str] = None
    location: Optional[str] = None
    site_managers: Optional[List[str]] = None
    receive_staff: Optional[str] = None
    receive_date: Optional[str] = None        # 'YYYY-MM-DD'
    process_staff: Optional[List[str]] = None
    display_order: Optional[int] = 0
    call_done: Optional[bool] = False
    is_allday: Optional[bool] = False
    is_done: Optional[bool] = False
    is_important: Optional[bool] = False
    start_at: str = Field(..., description="처리일시(시작) ISO-8601")
    end_at: Optional[str] = None
    title: Optional[str] = None
    equipment_rows: Optional[list] = None     # [{name, serial, ...}]
    extra: Optional[dict] = None              # 카테고리별 동적 필드
    attachments: Optional[list] = None        # [{url, type, name}]
    consult_id: Optional[str] = None
    visit_id: Optional[str] = None
    customer_id: Optional[str] = None
    created_by_name: Optional[str] = None

class ScheduleEventUpdate(ScheduleEventCreate):
    category: Optional[str] = None
    start_at: Optional[str] = None


class ScheduleEventResponse(BaseModel):
    id: str
    category: str
    worktype: Optional[str] = None
    use_company: Optional[str] = None
    contract_company: Optional[str] = None
    location: Optional[str] = None
    site_managers: Optional[List[str]] = None
    receive_staff: Optional[str] = None
    receive_date: Optional[str] = None
    process_staff: Optional[List[str]] = None
    display_order: int = 0
    call_done: bool = False
    is_allday: bool = False
    is_done: bool = False
    is_important: bool = False
    start_at: str
    end_at: Optional[str] = None
    title: Optional[str] = None
    equipment_rows: Optional[list] = None
    extra: Optional[dict] = None
    attachments: Optional[list] = None
    consult_id: Optional[str] = None
    visit_id: Optional[str] = None
    customer_id: Optional[str] = None
    created_by: Optional[str] = None
    created_at: str
    updated_at: str


# ─── 헬퍼 ────────────────────────────────────────────────────────────────────

def _parse_json_field(raw):
    """DB에서 꺼낸 JSON 문자열 또는 이미 파싱된 값을 안전하게 반환"""
    if raw is None:
        return None
    if isinstance(raw, (dict, list)):
        return raw
    try:
        return json.loads(raw)
    except Exception:
        return None


def _row_to_response(r) -> ScheduleEventResponse:
    return ScheduleEventResponse(
        id=str(r.id),
        category=r.category,
        worktype=r.worktype,
        use_company=r.use_company,
        contract_company=r.contract_company,
        location=r.location,
        site_managers=_parse_json_field(r.site_managers),
        receive_staff=r.receive_staff,
        receive_date=r.receive_date.isoformat() if r.receive_date else None,
        process_staff=_parse_json_field(r.process_staff),
        display_order=r.display_order or 0,
        call_done=bool(r.call_done),
        is_allday=bool(r.is_allday),
        is_done=bool(r.is_done),
        is_important=bool(r.is_important),
        start_at=r.start_at.isoformat() if r.start_at else "",
        end_at=r.end_at.isoformat() if r.end_at else None,
        title=r.title,
        equipment_rows=_parse_json_field(r.equipment_rows),
        extra=_parse_json_field(r.extra),
        attachments=_parse_json_field(r.attachments),
        consult_id=str(r.consult_id) if r.consult_id else None,
        visit_id=str(r.visit_id) if r.visit_id else None,
        customer_id=str(r.customer_id) if r.customer_id else None,
        created_by=str(r.created_by) if r.created_by else None,
        created_at=r.created_at.isoformat() if r.created_at else "",
        updated_at=r.updated_at.isoformat() if r.updated_at else "",
    )


async def _resolve_employee_id(name: Optional[str], db: AsyncSession) -> Optional[uuid.UUID]:
    if not name:
        return None
    res = await db.execute(
        text("SELECT id FROM employees WHERE name = :name LIMIT 1"),
        {"name": name.strip()}
    )
    row = res.fetchone()
    return row.id if row else None


# ─── 엔드포인트 ───────────────────────────────────────────────────────────────

@router.get("/events", response_model=List[ScheduleEventResponse])
async def list_schedule_events(
    start: Optional[str] = Query(None, description="기간 시작 (YYYY-MM-DD)"),
    end: Optional[str] = Query(None, description="기간 종료 (YYYY-MM-DD)"),
    category: Optional[str] = Query(None, description="카테고리 필터 (복수 콤마 구분)"),
    is_done: Optional[bool] = Query(None, description="완료 여부 필터"),
    limit: int = Query(200, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """업무 일정 목록 조회 — 기간·카테고리·완료 여부 필터"""
    conditions = []
    params: dict = {"limit": limit, "offset": offset}

    if start:
        conditions.append("start_at >= :start_dt")
        params["start_dt"] = f"{start}T00:00:00+00:00"
    if end:
        conditions.append("start_at <= :end_dt")
        params["end_dt"] = f"{end}T23:59:59+00:00"
    if category:
        cats = [c.strip() for c in category.split(",") if c.strip()]
        if cats:
            conditions.append("category = ANY(:cats)")
            params["cats"] = cats
    if is_done is not None:
        conditions.append("is_done = :is_done")
        params["is_done"] = is_done

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    q = text(f"""
        SELECT id, category, worktype, use_company, contract_company, location,
               site_managers, receive_staff, receive_date, process_staff,
               display_order, call_done, is_allday, is_done, is_important,
               start_at, end_at, title, equipment_rows, extra, attachments,
               consult_id, visit_id, customer_id, created_by, created_at, updated_at
        FROM schedule_events
        {where}
        ORDER BY start_at DESC
        LIMIT :limit OFFSET :offset
    """)
    result = await db.execute(q, params)
    rows = result.fetchall()
    return [_row_to_response(r) for r in rows]


@router.get("/events/{event_id}", response_model=ScheduleEventResponse)
async def get_schedule_event(event_id: str, db: AsyncSession = Depends(get_db)):
    """업무 일정 단건 조회"""
    q = text("""
        SELECT id, category, worktype, use_company, contract_company, location,
               site_managers, receive_staff, receive_date, process_staff,
               display_order, call_done, is_allday, is_done, is_important,
               start_at, end_at, title, equipment_rows, extra, attachments,
               consult_id, visit_id, customer_id, created_by, created_at, updated_at
        FROM schedule_events WHERE id = :eid
    """)
    result = await db.execute(q, {"eid": event_id})
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="일정을 찾을 수 없습니다.")
    return _row_to_response(row)


@router.post("/events", response_model=ScheduleEventResponse, status_code=201)
async def create_schedule_event(req: ScheduleEventCreate, db: AsyncSession = Depends(get_db)):
    """업무 일정 생성"""
    if req.category not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"유효하지 않은 카테고리: {req.category}")

    emp_id = await _resolve_employee_id(req.created_by_name, db)
    new_id = uuid.uuid4()

    ins = text("""
        INSERT INTO schedule_events (
            id, category, worktype, use_company, contract_company, location,
            site_managers, receive_staff, receive_date, process_staff,
            display_order, call_done, is_allday, is_done, is_important,
            start_at, end_at, title, equipment_rows, extra, attachments,
            consult_id, visit_id, customer_id, created_by,
            created_at, updated_at
        ) VALUES (
            :id, :category, :worktype, :use_company, :contract_company, :location,
            :site_managers::jsonb, :receive_staff, :receive_date, :process_staff::jsonb,
            :display_order, :call_done, :is_allday, :is_done, :is_important,
            :start_at, :end_at, :title,
            :equipment_rows::jsonb, :extra::jsonb, :attachments::jsonb,
            :consult_id, :visit_id, :customer_id, :created_by,
            NOW(), NOW()
        )
        RETURNING id, category, worktype, use_company, contract_company, location,
                  site_managers, receive_staff, receive_date, process_staff,
                  display_order, call_done, is_allday, is_done, is_important,
                  start_at, end_at, title, equipment_rows, extra, attachments,
                  consult_id, visit_id, customer_id, created_by, created_at, updated_at
    """)

    def _to_str(v) -> Optional[str]:
        if v is None:
            return None
        return json.dumps(v, ensure_ascii=False)

    result = await db.execute(ins, {
        "id": new_id,
        "category": req.category,
        "worktype": req.worktype,
        "use_company": req.use_company,
        "contract_company": req.contract_company,
        "location": req.location,
        "site_managers": _to_str(req.site_managers) if req.site_managers else "null",
        "receive_staff": req.receive_staff,
        "receive_date": req.receive_date,
        "process_staff": _to_str(req.process_staff) if req.process_staff else "null",
        "display_order": req.display_order or 0,
        "call_done": req.call_done or False,
        "is_allday": req.is_allday or False,
        "is_done": req.is_done or False,
        "is_important": req.is_important or False,
        "start_at": req.start_at,
        "end_at": req.end_at,
        "title": req.title,
        "equipment_rows": _to_str(req.equipment_rows) if req.equipment_rows else "null",
        "extra": _to_str(req.extra) if req.extra else "null",
        "attachments": _to_str(req.attachments) if req.attachments else "null",
        "consult_id": uuid.UUID(req.consult_id) if req.consult_id else None,
        "visit_id": uuid.UUID(req.visit_id) if req.visit_id else None,
        "customer_id": uuid.UUID(req.customer_id) if req.customer_id else None,
        "created_by": emp_id,
    })
    row = result.fetchone()

    # 감사 로그 무누락 기록
    await db.execute(text("""
        INSERT INTO audit_log_minimal (id, table_name, record_id, action, changed_by, changed_at)
        VALUES (:aid, 'schedule_events', :rid, 'INSERT', :emp_id, NOW())
    """), {"aid": uuid.uuid4(), "rid": new_id, "emp_id": emp_id})

    await db.commit()
    return _row_to_response(row)


@router.put("/events/{event_id}", response_model=ScheduleEventResponse)
async def update_schedule_event(
    event_id: str,
    req: ScheduleEventUpdate,
    db: AsyncSession = Depends(get_db)
):
    """업무 일정 수정"""
    # 존재 확인
    chk = await db.execute(text("SELECT id FROM schedule_events WHERE id = :eid"), {"eid": event_id})
    if not chk.fetchone():
        raise HTTPException(status_code=404, detail="일정을 찾을 수 없습니다.")

    emp_id = await _resolve_employee_id(req.created_by_name, db)

    def _to_str(v) -> Optional[str]:
        if v is None:
            return "null"
        return json.dumps(v, ensure_ascii=False)

    upd = text("""
        UPDATE schedule_events SET
            category         = COALESCE(:category, category),
            worktype         = :worktype,
            use_company      = :use_company,
            contract_company = :contract_company,
            location         = :location,
            site_managers    = COALESCE(:site_managers::jsonb, site_managers),
            receive_staff    = :receive_staff,
            receive_date     = :receive_date,
            process_staff    = COALESCE(:process_staff::jsonb, process_staff),
            display_order    = COALESCE(:display_order, display_order),
            call_done        = COALESCE(:call_done, call_done),
            is_allday        = COALESCE(:is_allday, is_allday),
            is_done          = COALESCE(:is_done, is_done),
            is_important     = COALESCE(:is_important, is_important),
            start_at         = COALESCE(:start_at::timestamptz, start_at),
            end_at           = :end_at,
            title            = :title,
            equipment_rows   = COALESCE(:equipment_rows::jsonb, equipment_rows),
            extra            = COALESCE(:extra::jsonb, extra),
            attachments      = COALESCE(:attachments::jsonb, attachments),
            consult_id       = :consult_id,
            visit_id         = :visit_id,
            customer_id      = :customer_id,
            updated_at       = NOW()
        WHERE id = :eid
        RETURNING id, category, worktype, use_company, contract_company, location,
                  site_managers, receive_staff, receive_date, process_staff,
                  display_order, call_done, is_allday, is_done, is_important,
                  start_at, end_at, title, equipment_rows, extra, attachments,
                  consult_id, visit_id, customer_id, created_by, created_at, updated_at
    """)
    result = await db.execute(upd, {
        "eid": event_id,
        "category": req.category,
        "worktype": req.worktype,
        "use_company": req.use_company,
        "contract_company": req.contract_company,
        "location": req.location,
        "site_managers": _to_str(req.site_managers) if req.site_managers is not None else None,
        "receive_staff": req.receive_staff,
        "receive_date": req.receive_date,
        "process_staff": _to_str(req.process_staff) if req.process_staff is not None else None,
        "display_order": req.display_order,
        "call_done": req.call_done,
        "is_allday": req.is_allday,
        "is_done": req.is_done,
        "is_important": req.is_important,
        "start_at": req.start_at,
        "end_at": req.end_at,
        "title": req.title,
        "equipment_rows": _to_str(req.equipment_rows) if req.equipment_rows is not None else None,
        "extra": _to_str(req.extra) if req.extra is not None else None,
        "attachments": _to_str(req.attachments) if req.attachments is not None else None,
        "consult_id": uuid.UUID(req.consult_id) if req.consult_id else None,
        "visit_id": uuid.UUID(req.visit_id) if req.visit_id else None,
        "customer_id": uuid.UUID(req.customer_id) if req.customer_id else None,
    })
    row = result.fetchone()

    # 감사 로그
    await db.execute(text("""
        INSERT INTO audit_log_minimal (id, table_name, record_id, action, changed_by, changed_at)
        VALUES (:aid, 'schedule_events', :rid, 'UPDATE', :emp_id, NOW())
    """), {"aid": uuid.uuid4(), "rid": event_id, "emp_id": emp_id})

    await db.commit()
    return _row_to_response(row)


@router.delete("/events/{event_id}", status_code=204)
async def delete_schedule_event(
    event_id: str,
    deleted_by_name: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """업무 일정 삭제"""
    chk = await db.execute(text("SELECT id FROM schedule_events WHERE id = :eid"), {"eid": event_id})
    if not chk.fetchone():
        raise HTTPException(status_code=404, detail="일정을 찾을 수 없습니다.")

    emp_id = await _resolve_employee_id(deleted_by_name, db)
    await db.execute(text("DELETE FROM schedule_events WHERE id = :eid"), {"eid": event_id})

    # 감사 로그
    await db.execute(text("""
        INSERT INTO audit_log_minimal (id, table_name, record_id, action, changed_by, changed_at)
        VALUES (:aid, 'schedule_events', :rid, 'DELETE', :emp_id, NOW())
    """), {"aid": uuid.uuid4(), "rid": event_id, "emp_id": emp_id})

    await db.commit()


@router.get("/categories")
async def list_categories():
    """업무 카테고리 목록 (space-dust 동일 구조)"""
    return [
        {"key": "sales-demo",     "label": "영업/시연",   "color": "#16a34a"},
        {"key": "equip-ship",     "label": "장비출고",    "color": "#0891b2"},
        {"key": "part-ship",      "label": "부품출고",    "color": "#2563eb"},
        {"key": "rental-ship",    "label": "렌탈출고",    "color": "#7c3aed"},
        {"key": "as-service",     "label": "A/S접수",    "color": "#dc2626"},
        {"key": "purchase-check", "label": "매입실사",    "color": "#d97706"},
        {"key": "maintenance",    "label": "유지보수",    "color": "#0d9488"},
        {"key": "other",          "label": "기타",        "color": "#64748b"},
    ]
