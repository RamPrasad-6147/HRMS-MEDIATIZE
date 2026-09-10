"""create_daily_work_reports_table

Revision ID: 7cc1e85c3999
Revises: 7b74d90b70f2
Create Date: 2026-09-05 15:42:32.788392

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7cc1e85c3999'
down_revision: Union[str, Sequence[str], None] = '7b74d90b70f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'WORK_REPORT_CREATED'")
    op.create_table(
        'daily_work_reports',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('employee_id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('work_description', sa.Text(), nullable=False),
        sa.Column('problems_faced', sa.Text(), nullable=True),
        sa.Column('document_url', sa.String(length=500), nullable=True),
        sa.Column('document_public_id', sa.String(length=255), nullable=True),
        sa.Column('document_name', sa.String(length=255), nullable=True),
        sa.Column('report_date', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('employee_id', 'project_id', 'report_date', name='uq_daily_work_reports_emp_proj_date')
    )
    op.create_index('ix_daily_work_reports_emp_date', 'daily_work_reports', ['employee_id', 'report_date'], unique=False)
    op.create_index(op.f('ix_daily_work_reports_employee_id'), 'daily_work_reports', ['employee_id'], unique=False)
    op.create_index(op.f('ix_daily_work_reports_project_id'), 'daily_work_reports', ['project_id'], unique=False)
    op.create_index(op.f('ix_daily_work_reports_report_date'), 'daily_work_reports', ['report_date'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_daily_work_reports_report_date'), table_name='daily_work_reports')
    op.drop_index(op.f('ix_daily_work_reports_project_id'), table_name='daily_work_reports')
    op.drop_index(op.f('ix_daily_work_reports_employee_id'), table_name='daily_work_reports')
    op.drop_index('ix_daily_work_reports_emp_date', table_name='daily_work_reports')
    op.drop_table('daily_work_reports')
