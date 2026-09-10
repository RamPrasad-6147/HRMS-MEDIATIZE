"""add_hr_profile_audit_actions

Revision ID: 7b3c9a1e2f4d
Revises: 6a2a5cccba01
Create Date: 2026-09-08 21:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7b3c9a1e2f4d'
down_revision: Union[str, Sequence[str], None] = '6a2a5cccba01'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute(
        "ALTER TYPE audit_action "
        "ADD VALUE IF NOT EXISTS 'HR_PROFILE_UPDATED'"
    )
    op.execute(
        "ALTER TYPE audit_action "
        "ADD VALUE IF NOT EXISTS 'HR_PROFILE_PHOTO_UPDATED'"
    )


def downgrade() -> None:
    """Downgrade schema."""
    pass
