"""add_performance_and_analytics

Revision ID: 9ff3g21da35c
Revises: 8ee2f10ca24b
Create Date: 2026-09-05 16:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '9ff3g21da35c'
down_revision: Union[str, Sequence[str], None] = '8ee2f10ca24b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # AuditAction enum updates for PostgreSQL
    op.execute("ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PERFORMANCE_REVIEW_CREATED'")
    op.execute("ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PERFORMANCE_REVIEW_UPDATED'")
    op.execute("ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PERFORMANCE_REVIEW_COMPLETED'")
    op.execute("ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PERFORMANCE_RATING_UPDATED'")
    op.execute("ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PERFORMANCE_GOAL_CREATED'")
    op.execute("ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PERFORMANCE_GOAL_UPDATED'")
    op.execute("ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PERFORMANCE_GOAL_STATUS_CHANGED'")

    # Safely create review_status enum
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_status') THEN
                CREATE TYPE review_status AS ENUM ('DRAFT', 'COMPLETED');
            END IF;
        END$$;
    """)

    # Safely create goal_status enum
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'goal_status') THEN
                CREATE TYPE goal_status AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
            END IF;
        END$$;
    """)

    review_status_type = postgresql.ENUM('DRAFT', 'COMPLETED', name='review_status', create_type=False)
    goal_status_type = postgresql.ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', name='goal_status', create_type=False)

    # Create performance_reviews table
    op.create_table(
        'performance_reviews',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('employee_id', sa.Integer(), nullable=False),
        sa.Column('review_start_date', sa.Date(), nullable=False),
        sa.Column('review_end_date', sa.Date(), nullable=False),
        sa.Column('status', review_status_type, nullable=False, server_default='DRAFT'),
        sa.Column('overall_rating', sa.Numeric(precision=3, scale=1), nullable=True),
        sa.Column('overall_feedback', sa.Text(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('review_start_date <= review_end_date', name='chk_review_dates')
    )
    op.create_index(op.f('ix_performance_reviews_employee_id'), 'performance_reviews', ['employee_id'], unique=False)
    op.create_index(op.f('ix_performance_reviews_status'), 'performance_reviews', ['status'], unique=False)
    op.create_index('ix_performance_reviews_dates', 'performance_reviews', ['review_start_date', 'review_end_date'], unique=False)

    # Create performance_review_ratings table
    op.create_table(
        'performance_review_ratings',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('review_id', sa.Integer(), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('rating', sa.Integer(), nullable=False),
        sa.Column('comments', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['review_id'], ['performance_reviews.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('rating >= 1 AND rating <= 5', name='chk_rating_range')
    )
    op.create_index(op.f('ix_performance_review_ratings_review_id'), 'performance_review_ratings', ['review_id'], unique=False)

    # Create performance_goals table
    op.create_table(
        'performance_goals',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('employee_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('target_date', sa.Date(), nullable=False),
        sa.Column('status', goal_status_type, nullable=False, server_default='NOT_STARTED'),
        sa.Column('progress_percentage', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('progress_percentage >= 0 AND progress_percentage <= 100', name='chk_goal_progress_range')
    )
    op.create_index(op.f('ix_performance_goals_employee_id'), 'performance_goals', ['employee_id'], unique=False)
    op.create_index(op.f('ix_performance_goals_status'), 'performance_goals', ['status'], unique=False)
    op.create_index(op.f('ix_performance_goals_target_date'), 'performance_goals', ['target_date'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_performance_goals_target_date'), table_name='performance_goals')
    op.drop_index(op.f('ix_performance_goals_status'), table_name='performance_goals')
    op.drop_index(op.f('ix_performance_goals_employee_id'), table_name='performance_goals')
    op.drop_table('performance_goals')

    op.drop_index(op.f('ix_performance_review_ratings_review_id'), table_name='performance_review_ratings')
    op.drop_table('performance_review_ratings')

    op.drop_index('ix_performance_reviews_dates', table_name='performance_reviews')
    op.drop_index(op.f('ix_performance_reviews_status'), table_name='performance_reviews')
    op.drop_index(op.f('ix_performance_reviews_employee_id'), table_name='performance_reviews')
    op.drop_table('performance_reviews')

    op.execute("DROP TYPE IF EXISTS goal_status")
    op.execute("DROP TYPE IF EXISTS review_status")
