"""add schedule_events and transfer_centers

Revision ID: a3f9d2c1e847
Revises: 8b72c91a03e1
Create Date: 2026-08-26 11:20:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a3f9d2c1e847'
down_revision: Union[str, Sequence[str], None] = '8b72c91a03e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. transfer_centers 이관센터 마스터 테이블
    op.execute("""
        CREATE TABLE IF NOT EXISTS transfer_centers (
            id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name    VARCHAR(100) NOT NULL,
            address TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    """)

    # 2. schedule_events 업무 일정 핵심 테이블
    op.execute("""
        CREATE TABLE IF NOT EXISTS schedule_events (
            id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            category         VARCHAR(30)  NOT NULL,
            worktype         VARCHAR(100),
            use_company      VARCHAR(100),
            contract_company VARCHAR(100),
            location         TEXT,
            site_managers    JSONB,
            receive_staff    VARCHAR(50),
            receive_date     DATE,
            process_staff    JSONB,
            display_order    SMALLINT DEFAULT 0,
            call_done        BOOLEAN DEFAULT FALSE,
            is_allday        BOOLEAN DEFAULT FALSE,
            is_done          BOOLEAN DEFAULT FALSE,
            is_important     BOOLEAN DEFAULT FALSE,
            start_at         TIMESTAMP WITH TIME ZONE NOT NULL,
            end_at           TIMESTAMP WITH TIME ZONE,
            title            VARCHAR(300),
            equipment_rows   JSONB,
            extra            JSONB,
            attachments      JSONB,
            consult_id       UUID REFERENCES consult_logs(id) ON DELETE SET NULL,
            visit_id         UUID REFERENCES visits(id) ON DELETE SET NULL,
            customer_id      UUID REFERENCES customers(id) ON DELETE SET NULL,
            created_by       UUID REFERENCES employees(id) ON DELETE SET NULL,
            created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_se_start_at ON schedule_events (start_at DESC);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_se_category ON schedule_events (category);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_se_done_start ON schedule_events (is_done, start_at);")

    # 3. visits 테이블 보완 컬럼
    op.execute("ALTER TABLE visits ADD COLUMN IF NOT EXISTS display_order SMALLINT DEFAULT 0;")
    op.execute("ALTER TABLE visits ADD COLUMN IF NOT EXISTS process_staff JSONB;")
    op.execute("ALTER TABLE visits ADD COLUMN IF NOT EXISTS site_managers JSONB;")
    op.execute("ALTER TABLE visits ADD COLUMN IF NOT EXISTS call_done BOOLEAN DEFAULT FALSE;")
    op.execute("ALTER TABLE visits ADD COLUMN IF NOT EXISTS schedule_event_id UUID REFERENCES schedule_events(id) ON DELETE SET NULL;")

    # 4. customers 테이블 보완 컬럼 (사용업체 분리)
    op.execute("ALTER TABLE customers ADD COLUMN IF NOT EXISTS use_company_name VARCHAR(100);")


def downgrade() -> None:
    op.execute("ALTER TABLE customers DROP COLUMN IF EXISTS use_company_name;")
    op.execute("ALTER TABLE visits DROP COLUMN IF EXISTS schedule_event_id;")
    op.execute("ALTER TABLE visits DROP COLUMN IF EXISTS call_done;")
    op.execute("ALTER TABLE visits DROP COLUMN IF EXISTS site_managers;")
    op.execute("ALTER TABLE visits DROP COLUMN IF EXISTS process_staff;")
    op.execute("ALTER TABLE visits DROP COLUMN IF EXISTS display_order;")
    op.execute("DROP TABLE IF EXISTS schedule_events;")
    op.execute("DROP TABLE IF EXISTS transfer_centers;")
