"""restore trgm and add vehicle inventory

Revision ID: 8b72c91a03e1
Revises: 592f319e9774
Create Date: 2026-08-24 02:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '8b72c91a03e1'
down_revision: Union[str, Sequence[str], None] = '592f319e9774'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. pg_trgm extension & GIN indexes
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")
    op.execute("CREATE INDEX IF NOT EXISTS idx_sr_keyword_trgm ON symptom_rules USING gin (keyword gin_trgm_ops);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_sr_part_code_active ON symptom_rules (part_code, is_active);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_visits_status_ts ON visits (status, timestamp DESC);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_visit_parts_composite ON visit_parts (visit_id, part_id);")

    # 2. vehicle_inventories table
    op.execute("""
        CREATE TABLE IF NOT EXISTS vehicle_inventories (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
            part_id UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
            quantity INTEGER NOT NULL DEFAULT 0,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_vi_employee_part ON vehicle_inventories (employee_id, part_id);")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS vehicle_inventories;")
    op.execute("DROP INDEX IF EXISTS idx_sr_keyword_trgm;")
    op.execute("DROP INDEX IF EXISTS idx_sr_part_code_active;")
    op.execute("DROP INDEX IF EXISTS idx_visits_status_ts;")
    op.execute("DROP INDEX IF EXISTS idx_visit_parts_composite;")
