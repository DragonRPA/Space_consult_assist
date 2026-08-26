import uuid
from datetime import datetime
from sqlalchemy import UniqueConstraint, String, Integer, Boolean, DateTime, ForeignKey, Text, SmallInteger, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from .base import Base

# --- Master Tables ---

class PartCode(Base):
    __tablename__ = "part_codes"
    code: Mapped[str] = mapped_column(String(40), primary_key=True)
    description: Mapped[str] = mapped_column(String(200), nullable=True)

class Part(Base):
    __tablename__ = "parts"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    compatible_models: Mapped[str] = mapped_column(String(200), nullable=True)
    unit_price: Mapped[int] = mapped_column(Integer, nullable=True)
    stock: Mapped[int] = mapped_column(Integer, default=0)
    note: Mapped[str] = mapped_column(Text, nullable=True)
    expected_lifespan: Mapped[str] = mapped_column(String(100), nullable=True)

class Employee(Base):
    __tablename__ = "employees"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=True)

# --- Core Entities ---

class Asset(Base):
    __tablename__ = "assets"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)
    serial_number: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    sales_type: Mapped[str] = mapped_column(String(50), nullable=True)
    sales_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    sales_price: Mapped[int] = mapped_column(Integer, nullable=True)
    warranty_period: Mapped[str] = mapped_column(String(100), nullable=True)

class Customer(Base):
    __tablename__ = "customers"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    manager: Mapped[str] = mapped_column(String(50), nullable=True)
    manager_phone: Mapped[str] = mapped_column(String(20), nullable=True)
    email: Mapped[str] = mapped_column(String(100), nullable=True)
    address: Mapped[str] = mapped_column(String(200), nullable=True)
    address_detail: Mapped[str] = mapped_column(String(200), nullable=True)
    asset_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("assets.id"), nullable=True)

class AssetHistory(Base):
    __tablename__ = "asset_history"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    serial_number: Mapped[str] = mapped_column(String(100), nullable=False)
    history_type: Mapped[str] = mapped_column(String(50), nullable=True)
    keyword: Mapped[str] = mapped_column(String(100), nullable=True)
    symptom: Mapped[str] = mapped_column(Text, nullable=True)
    action_type: Mapped[str] = mapped_column(String(100), nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    used_part_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("parts.id"), nullable=True)

# --- Process Entities ---

class ConsultLog(Base):
    __tablename__ = "consult_logs"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    customer_name: Mapped[str] = mapped_column(String(100), nullable=True)
    manager: Mapped[str] = mapped_column(String(50), nullable=True)
    serial_number: Mapped[str] = mapped_column(String(100), nullable=True)
    model_name: Mapped[str] = mapped_column(String(100), nullable=True)
    keyword: Mapped[str] = mapped_column(String(200), nullable=True)
    symptom: Mapped[str] = mapped_column(Text, nullable=True)
    action: Mapped[str] = mapped_column(Text, nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    receiver_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("employees.id"), nullable=True)
    is_visit_required: Mapped[bool] = mapped_column(Boolean, default=False)
    visit_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=True) # Will set FK later if needed

class Visit(Base):
    __tablename__ = "visits"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    employee_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("employees.id"), nullable=True)
    customer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("customers.id"), nullable=True)
    customer_name: Mapped[str] = mapped_column(String(100), nullable=True)
    manager: Mapped[str] = mapped_column(String(50), nullable=True)
    phone: Mapped[str] = mapped_column(String(20), nullable=True)
    address: Mapped[str] = mapped_column(String(200), nullable=True)
    address_detail: Mapped[str] = mapped_column(String(200), nullable=True)
    consult_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("consult_logs.id"), nullable=True)
    request_note: Mapped[str] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default='접수') # '접수', '진행중', '완료', '취소', '재방문'
    note: Mapped[str] = mapped_column(Text, nullable=True)

class SalesInquiry(Base):
    __tablename__ = "sales_inquiries"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    inquiry_type: Mapped[str] = mapped_column(String(50), nullable=True)
    customer_name: Mapped[str] = mapped_column(String(100), nullable=True)
    manager: Mapped[str] = mapped_column(String(50), nullable=True)
    manager_phone: Mapped[str] = mapped_column(String(20), nullable=True)
    request_note: Mapped[str] = mapped_column(Text, nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    client_type: Mapped[str] = mapped_column(String(20), default='desktop')

# --- New Tables (v3.0.0) ---

class SymptomRule(Base):
    __tablename__ = "symptom_rules"
    __table_args__ = (UniqueConstraint('keyword', 'part_code', name='uq_keyword_part_code'),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    keyword: Mapped[str] = mapped_column(Text, nullable=False)
    part_code: Mapped[str] = mapped_column(ForeignKey("part_codes.code"), nullable=False)
    category_l1: Mapped[str] = mapped_column(Text, nullable=False)
    category_l2: Mapped[str] = mapped_column(Text, nullable=True)
    action_category: Mapped[str] = mapped_column(Text, nullable=False)
    action_detail: Mapped[str] = mapped_column(Text, nullable=False)
    action_script: Mapped[str] = mapped_column(Text, nullable=True)
    cost_type: Mapped[str] = mapped_column(Text, nullable=False)
    confidence_tier: Mapped[int] = mapped_column(SmallInteger, default=1)
    priority: Mapped[int] = mapped_column(SmallInteger, default=100)
    source_count: Mapped[int] = mapped_column(Integer, default=1)
    source_engine: Mapped[str] = mapped_column(Text, default='gemma3:12b')
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class ConsultKeyword(Base):
    __tablename__ = "consult_keywords"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    consult_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("consult_logs.id"), nullable=False)
    keyword: Mapped[str] = mapped_column(String(100), nullable=False)

class LlmLog(Base):
    __tablename__ = "llm_logs"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    consult_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("consult_logs.id"), nullable=True)
    called_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    model_name: Mapped[str] = mapped_column(Text, nullable=False)
    prompt_hash: Mapped[str] = mapped_column(Text, nullable=False)
    prompt_text: Mapped[str] = mapped_column(Text, nullable=False)
    response_text: Mapped[str] = mapped_column(Text, nullable=True)
    latency_ms: Mapped[int] = mapped_column(Integer, nullable=True)
    is_error: Mapped[bool] = mapped_column(Boolean, default=False)
    error_message: Mapped[str] = mapped_column(Text, nullable=True)
    cache_hit: Mapped[bool] = mapped_column(Boolean, default=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    client_type: Mapped[str] = mapped_column(String(20), default='desktop')

class VisitStatusHistory(Base):
    __tablename__ = "visit_status_history"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    visit_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("visits.id"), nullable=False)
    old_status: Mapped[str] = mapped_column(Text, nullable=True)
    new_status: Mapped[str] = mapped_column(Text, nullable=False)
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    changed_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("employees.id"), nullable=True)
    client_type: Mapped[str] = mapped_column(String(20), default='desktop')

class AuditLogMinimal(Base):
    __tablename__ = "audit_log_minimal"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    table_name: Mapped[str] = mapped_column(String(50), nullable=False)
    record_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    action: Mapped[str] = mapped_column(String(20), nullable=False)
    changed_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("employees.id"), nullable=True)
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class ClassificationAttempt(Base):
    __tablename__ = "classification_attempts"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    consult_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("consult_logs.id"), nullable=True)
    input_text: Mapped[str] = mapped_column(Text, nullable=False)
    matched_keyword: Mapped[str] = mapped_column(Text, nullable=True)
    is_successful: Mapped[bool] = mapped_column(Boolean, default=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class VisitPart(Base):
    __tablename__ = "visit_parts"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    visit_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("visits.id"), nullable=False)
    part_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("parts.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class VehicleInventory(Base):
    __tablename__ = "vehicle_inventories"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    employee_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("employees.id"), nullable=False)
    part_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("parts.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# --- Phase 3: 업무 일정 관리 ---

class TransferCenter(Base):
    """이관센터 마스터"""
    __tablename__ = "transfer_centers"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ScheduleEvent(Base):
    """업무 일정 (space-dust 캘린더 이관 대상 핵심 테이블)

    카테고리별 동적 필드는 extra JSONB에 통째로 저장.
    장비 목록(호차별 관리)은 equipment_rows JSONB.
    첨부파일 URL 목록은 attachments JSONB.
    """
    __tablename__ = "schedule_events"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    category: Mapped[str] = mapped_column(String(30), nullable=False)          # 'sales-demo'|'equip-ship'|...
    worktype: Mapped[str] = mapped_column(String(100), nullable=True)
    use_company: Mapped[str] = mapped_column(String(100), nullable=True)        # 사용업체
    contract_company: Mapped[str] = mapped_column(String(100), nullable=True)   # 계약업체
    location: Mapped[str] = mapped_column(Text, nullable=True)                  # 주소
    site_managers: Mapped[dict] = mapped_column(ARRAY(String), nullable=True)   # 현장담당자 목록
    receive_staff: Mapped[str] = mapped_column(String(50), nullable=True)
    receive_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    process_staff: Mapped[dict] = mapped_column(ARRAY(String), nullable=True)   # 처리직원 목록
    display_order: Mapped[int] = mapped_column(SmallInteger, default=0)
    call_done: Mapped[bool] = mapped_column(Boolean, default=False)
    is_allday: Mapped[bool] = mapped_column(Boolean, default=False)
    is_done: Mapped[bool] = mapped_column(Boolean, default=False)
    is_important: Mapped[bool] = mapped_column(Boolean, default=False)
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    title: Mapped[str] = mapped_column(String(300), nullable=True)
    equipment_rows: Mapped[dict] = mapped_column(Text, nullable=True)           # JSONB (SQLite 호환용 Text)
    extra: Mapped[dict] = mapped_column(Text, nullable=True)                    # 카테고리별 동적 필드 JSONB
    attachments: Mapped[dict] = mapped_column(Text, nullable=True)              # [{url, type, name}]
    # 연결 키
    consult_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("consult_logs.id"), nullable=True)
    visit_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("visits.id"), nullable=True)
    customer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("customers.id"), nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("employees.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
