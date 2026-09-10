"""add purpose to email otps

Revision ID: bff4097423f6
Revises: c1d2e3f4a5b6
Create Date: 2026-09-09 11:25:40.167966

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bff4097423f6'
down_revision: Union[str, Sequence[str], None] = 'c1d2e3f4a5b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add purpose column to email_otps table."""

    email_otp_purpose = sa.Enum(
        'LOGIN',
        'EMAIL_CHANGE',
        name='email_otp_purpose',
    )

    email_otp_purpose.create(
        op.get_bind(),
        checkfirst=True,
    )

    op.add_column(
        'email_otps',
        sa.Column(
            'purpose',
            email_otp_purpose,
            nullable=False,
            server_default='LOGIN',
        ),
    )

    op.create_index(
        'ix_email_otps_purpose',
        'email_otps',
        ['purpose'],
        unique=False,
    )


def downgrade() -> None:
    """Remove purpose column from email_otps table."""

    op.drop_index(
        'ix_email_otps_purpose',
        table_name='email_otps',
    )

    op.drop_column(
        'email_otps',
        'purpose',
    )

    email_otp_purpose = sa.Enum(
        'LOGIN',
        'EMAIL_CHANGE',
        name='email_otp_purpose',
    )

    email_otp_purpose.drop(
        op.get_bind(),
        checkfirst=True,
    )