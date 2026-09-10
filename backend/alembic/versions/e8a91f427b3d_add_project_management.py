"""add_project_management

Revision ID: e8a91f427b3d
Revises: fd155b616e21
Create Date: 2026-09-04 22:53:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM as PGEnum


# revision identifiers, used by Alembic.
revision: str = 'e8a91f427b3d'
down_revision: Union[str, Sequence[str], None] = 'fd155b616e21'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema for Project Management."""
    # 1. Safely extend audit_action enum
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PROJECT_CREATED'")
        op.execute("ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PROJECT_UPDATED'")
        op.execute("ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PROJECT_STATUS_CHANGED'")
        op.execute("ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PROJECT_PROGRESS_UPDATED'")
        op.execute("ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PROJECT_ACTIVATED'")
        op.execute("ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PROJECT_DEACTIVATED'")
        op.execute("ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'EMPLOYEE_ASSIGNED_TO_PROJECT'")
        op.execute("ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'EMPLOYEE_REMOVED_FROM_PROJECT'")
        op.execute("ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PROJECT_ROLE_CREATED'")
        op.execute("ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PROJECT_ROLE_UPDATED'")
        op.execute("ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PROJECT_ROLE_ACTIVATED'")
        op.execute("ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PROJECT_ROLE_DEACTIVATED'")

    # 2. Create PostgreSQL enums safely
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_priority') THEN
                CREATE TYPE project_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status') THEN
                CREATE TYPE project_status AS ENUM ('PLANNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assignment_status') THEN
                CREATE TYPE assignment_status AS ENUM ('ACTIVE', 'REMOVED');
            END IF;
        END $$;
    """)

    # 3. Create project_roles table
    op.create_table(
        'project_roles',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_project_roles_name', 'project_roles', ['name'], unique=True)

    # 4. Create projects table using PGEnum
    op.create_table(
        'projects',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('project_code', sa.String(length=20), nullable=False),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('priority', PGEnum('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', name='project_priority', create_type=False), nullable=False, server_default='MEDIUM'),
        sa.Column('status', PGEnum('PLANNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED', name='project_status', create_type=False), nullable=False, server_default='PLANNED'),
        sa.Column('progress_percentage', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint('progress_percentage >= 0 AND progress_percentage <= 100', name='chk_project_progress_range'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_projects_project_code', 'projects', ['project_code'], unique=True)
    op.create_index('ix_projects_status', 'projects', ['status'], unique=False)
    op.create_index('ix_projects_priority', 'projects', ['priority'], unique=False)

    # 5. Create project_assignments table using PGEnum
    op.create_table(
        'project_assignments',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('employee_id', sa.Integer(), nullable=False),
        sa.Column('project_role_id', sa.Integer(), nullable=False),
        sa.Column('assigned_date', sa.Date(), nullable=False),
        sa.Column('removed_date', sa.Date(), nullable=True),
        sa.Column('status', PGEnum('ACTIVE', 'REMOVED', name='assignment_status', create_type=False), nullable=False, server_default='ACTIVE'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['project_role_id'], ['project_roles.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_project_assignments_project_id', 'project_assignments', ['project_id'], unique=False)
    op.create_index('ix_project_assignments_employee_id', 'project_assignments', ['employee_id'], unique=False)
    op.create_index('ix_project_assignments_role_id', 'project_assignments', ['project_role_id'], unique=False)

    # Partial Unique Index: Prevent multiple active assignments for the same employee to the same project
    op.execute("""
        CREATE UNIQUE INDEX ix_unique_active_project_assignment 
        ON project_assignments (project_id, employee_id) 
        WHERE status = 'ACTIVE'
    """)

    # 6. Seed initial standard project roles
    op.execute("""
        INSERT INTO project_roles (name, description, is_active, created_at, updated_at) VALUES
        ('Frontend Developer', 'Frontend user interface development', true, NOW(), NOW()),
        ('Backend Developer', 'Backend API & business logic development', true, NOW(), NOW()),
        ('Full Stack Developer', 'End-to-end full stack software engineering', true, NOW(), NOW()),
        ('Database Developer', 'Database design, optimization & SQL engineering', true, NOW(), NOW()),
        ('UI/UX Designer', 'Product design, wireframing & user experience', true, NOW(), NOW()),
        ('QA Engineer', 'Quality assurance, testing & validation', true, NOW(), NOW()),
        ('DevOps Engineer', 'CI/CD pipeline, infrastructure & deployment', true, NOW(), NOW()),
        ('Data Analyst', 'Data analysis, reporting & visualization', true, NOW(), NOW()),
        ('ML Engineer', 'Machine learning model development & deployment', true, NOW(), NOW()),
        ('Project Manager', 'Project management, planning & governance', true, NOW(), NOW()),
        ('Team Lead', 'Technical leadership & team coordination', true, NOW(), NOW())
        ON CONFLICT (name) DO NOTHING;
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP INDEX IF EXISTS ix_unique_active_project_assignment")
    op.drop_table('project_assignments')
    op.drop_table('projects')
    op.drop_table('project_roles')

    op.execute("DROP TYPE IF EXISTS assignment_status")
    op.execute("DROP TYPE IF EXISTS project_status")
    op.execute("DROP TYPE IF EXISTS project_priority")
