"""add_complaint_management

Revision ID: 8ee2f10ca24b
Revises: 7cc1e85c3999
Create Date: 2026-09-05 16:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8ee2f10ca24b'
down_revision: Union[str, Sequence[str], None] = '7cc1e85c3999'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Enum updates for PostgreSQL
    op.execute("ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'COMPLAINT_CREATED'")
    op.execute("ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'COMPLAINT_STATUS_UPDATED'")
    op.execute("ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'COMPLAINT_PRIORITY_UPDATED'")
    op.execute("ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'COMPLAINT_RESPONDED'")
    op.execute("ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'COMPLAINT_RESOLVED'")
    op.execute("ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'COMPLAINT_REJECTED'")
    op.execute("ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'COMPLAINT_CLOSED'")
    op.execute("ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'COMPLAINT_CATEGORY_CREATED'")
    op.execute("ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'COMPLAINT_CATEGORY_UPDATED'")

    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'COMPLAINT_SUBMITTED'")
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'COMPLAINT_UPDATED'")
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'COMPLAINT_RESOLVED'")

    # Create complaint_categories table
    op.create_table(
        'complaint_categories',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_complaint_categories_is_active'), 'complaint_categories', ['is_active'], unique=False)

    # Seed initial categories
    op.execute("""
        INSERT INTO complaint_categories (name, description, is_active, created_at, updated_at)
        VALUES 
            ('WORKPLACE', 'Workplace environment, culture, and interpersonal grievances', true, NOW(), NOW()),
            ('PAYROLL', 'Salary calculations, deductions, and pay slip queries', true, NOW(), NOW()),
            ('LEAVE', 'Leave requests, allocation, and entitlement disputes', true, NOW(), NOW()),
            ('ATTENDANCE', 'Punch logs, working hours, and overtime discrepancies', true, NOW(), NOW()),
            ('PROJECT', 'Project allocation, workload, and team assignment issues', true, NOW(), NOW()),
            ('MANAGER', 'Managerial feedback, supervisory actions, and team management', true, NOW(), NOW()),
            ('FACILITIES', 'Office facilities, seating, equipment, and building amenities', true, NOW(), NOW()),
            ('IT', 'Technical hardware, software access, and IT infrastructure', true, NOW(), NOW()),
            ('OTHER', 'General inquiries and other uncategorized grievances', true, NOW(), NOW())
        ON CONFLICT (name) DO NOTHING;
    """)

    # Create complaints table
    op.create_table(
        'complaints',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('complaint_code', sa.String(length=20), nullable=False),
        sa.Column('employee_id', sa.Integer(), nullable=False),
        sa.Column('category_id', sa.Integer(), nullable=False),
        sa.Column('subject', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('priority', sa.Enum('LOW', 'MEDIUM', 'HIGH', 'URGENT', name='complaint_priority'), nullable=False, server_default='MEDIUM'),
        sa.Column('status', sa.Enum('OPEN', 'UNDER_REVIEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED', name='complaint_status'), nullable=False, server_default='OPEN'),
        sa.Column('hr_response', sa.Text(), nullable=True),
        sa.Column('resolution', sa.Text(), nullable=True),
        sa.Column('attachment_url', sa.String(length=500), nullable=True),
        sa.Column('attachment_public_id', sa.String(length=255), nullable=True),
        sa.Column('attachment_name', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('closed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['category_id'], ['complaint_categories.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('complaint_code')
    )
    op.create_index(op.f('ix_complaints_category_id'), 'complaints', ['category_id'], unique=False)
    op.create_index(op.f('ix_complaints_complaint_code'), 'complaints', ['complaint_code'], unique=True)
    op.create_index(op.f('ix_complaints_created_at'), 'complaints', ['created_at'], unique=False)
    op.create_index(op.f('ix_complaints_employee_id'), 'complaints', ['employee_id'], unique=False)
    op.create_index('ix_complaints_emp_created', 'complaints', ['employee_id', 'created_at'], unique=False)
    op.create_index(op.f('ix_complaints_priority'), 'complaints', ['priority'], unique=False)
    op.create_index(op.f('ix_complaints_status'), 'complaints', ['status'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_complaints_status'), table_name='complaints')
    op.drop_index(op.f('ix_complaints_priority'), table_name='complaints')
    op.drop_index('ix_complaints_emp_created', table_name='complaints')
    op.drop_index(op.f('ix_complaints_employee_id'), table_name='complaints')
    op.drop_index(op.f('ix_complaints_created_at'), table_name='complaints')
    op.drop_index(op.f('ix_complaints_complaint_code'), table_name='complaints')
    op.drop_index(op.f('ix_complaints_category_id'), table_name='complaints')
    op.drop_table('complaints')

    op.drop_index(op.f('ix_complaint_categories_is_active'), table_name='complaint_categories')
    op.drop_table('complaint_categories')

    op.execute("DROP TYPE IF EXISTS complaint_status")
    op.execute("DROP TYPE IF EXISTS complaint_priority")
