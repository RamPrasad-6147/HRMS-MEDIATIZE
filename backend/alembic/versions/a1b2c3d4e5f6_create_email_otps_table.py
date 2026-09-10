"""create_email_otps_table

Revision ID: a1b2c3d4e5f6
Revises: 9ff3g21da35c
Create Date: 2026-09-08 14:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '9ff3g21da35c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'email_otps',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('otp_hash', sa.String(length=255), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('attempt_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('requested_ip', sa.String(length=45), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_email_otps_user_id'), 'email_otps', ['user_id'], unique=False)
    op.create_index(op.f('ix_email_otps_expires_at'), 'email_otps', ['expires_at'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_email_otps_expires_at'), table_name='email_otps')
    op.drop_index(op.f('ix_email_otps_user_id'), table_name='email_otps')
    op.drop_table('email_otps')
