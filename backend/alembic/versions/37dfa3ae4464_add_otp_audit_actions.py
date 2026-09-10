"""add otp audit actions

Revision ID: 37dfa3ae4464
Revises: 3a8575cc20e7
Create Date: 2026-09-08 16:48:04.690068

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "37dfa3ae4464"
down_revision: Union[str, Sequence[str], None] = "3a8575cc20e7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add OTP-related values to the existing PostgreSQL
    audit_action enum.
    """

    op.execute(
        "ALTER TYPE audit_action "
        "ADD VALUE IF NOT EXISTS 'OTP_REQUESTED'"
    )

    op.execute(
        "ALTER TYPE audit_action "
        "ADD VALUE IF NOT EXISTS 'OTP_VERIFY_SUCCESS'"
    )

    op.execute(
        "ALTER TYPE audit_action "
        "ADD VALUE IF NOT EXISTS 'OTP_VERIFY_FAILURE'"
    )

    op.execute(
        "ALTER TYPE audit_action "
        "ADD VALUE IF NOT EXISTS 'OTP_EXPIRED'"
    )

    op.execute(
        "ALTER TYPE audit_action "
        "ADD VALUE IF NOT EXISTS 'OTP_ATTEMPT_LIMIT_REACHED'"
    )


def downgrade() -> None:
    """
    PostgreSQL does not support safely removing individual
    values from an existing enum type.

    Therefore this migration intentionally has no downgrade.
    """
    pass