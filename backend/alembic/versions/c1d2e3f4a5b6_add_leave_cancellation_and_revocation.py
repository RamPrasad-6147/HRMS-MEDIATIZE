"""add_leave_cancellation_and_revocation

Revision ID: c1d2e3f4a5b6
Revises: 7b3c9a1e2f4d
Create Date: 2026-09-08 23:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1d2e3f4a5b6'
down_revision: Union[str, Sequence[str], None] = '7b3c9a1e2f4d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE leave_status ADD VALUE IF NOT EXISTS 'REVOKED'")
        op.execute("ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'LEAVE_REVOKED'")

    op.add_column('leave_requests', sa.Column('cancellation_reason', sa.Text(), nullable=True))
    op.add_column('leave_requests', sa.Column('cancelled_by', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True))
    op.add_column('leave_requests', sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('leave_requests', sa.Column('revocation_reason', sa.Text(), nullable=True))
    op.add_column('leave_requests', sa.Column('revoked_by', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True))
    op.add_column('leave_requests', sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('leave_requests', 'revoked_at')
    op.drop_column('leave_requests', 'revoked_by')
    op.drop_column('leave_requests', 'revocation_reason')
    op.drop_column('leave_requests', 'cancelled_at')
    op.drop_column('leave_requests', 'cancelled_by')
    op.drop_column('leave_requests', 'cancellation_reason')
