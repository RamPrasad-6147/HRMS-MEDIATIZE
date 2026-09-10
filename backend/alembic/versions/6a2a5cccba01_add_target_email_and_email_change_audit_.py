"""add_target_email_and_email_change_audit_actions

Revision ID: 6a2a5cccba01
Revises: 37dfa3ae4464
Create Date: 2026-09-08 17:32:09.780978

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6a2a5cccba01'
down_revision: Union[str, Sequence[str], None] = '37dfa3ae4464'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'email_otps',
        sa.Column('target_email', sa.String(length=255), nullable=True)
    )
    op.execute(
        "ALTER TYPE audit_action "
        "ADD VALUE IF NOT EXISTS 'EMAIL_CHANGE_REQUESTED'"
    )
    op.execute(
        "ALTER TYPE audit_action "
        "ADD VALUE IF NOT EXISTS 'EMAIL_CHANGE_VERIFY_SUCCESS'"
    )
    op.execute(
        "ALTER TYPE audit_action "
        "ADD VALUE IF NOT EXISTS 'EMAIL_CHANGE_VERIFY_FAILURE'"
    )
    op.execute(
        "ALTER TYPE audit_action "
        "ADD VALUE IF NOT EXISTS 'EMAIL_CHANGE_COMPLETED'"
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('email_otps', 'target_email')

