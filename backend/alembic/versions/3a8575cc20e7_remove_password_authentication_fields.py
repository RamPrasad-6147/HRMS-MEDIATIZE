"""remove password authentication fields

Revision ID: 3a8575cc20e7
Revises: a1b2c3d4e5f6
Create Date: 2026-09-08 16:15:08.802400

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "3a8575cc20e7"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove legacy password authentication fields."""

    op.drop_column(
        "users",
        "password_hash",
    )

    op.drop_column(
        "users",
        "must_change_password",
    )


def downgrade() -> None:
    """Restore legacy password authentication fields."""

    op.add_column(
        "users",
        __import__("sqlalchemy").Column(
            "password_hash",
            __import__("sqlalchemy").String(length=255),
            nullable=False,
            server_default="",
        ),
    )

    op.add_column(
        "users",
        __import__("sqlalchemy").Column(
            "must_change_password",
            __import__("sqlalchemy").Boolean(),
            nullable=False,
            server_default="false",
        ),
    )

    op.alter_column(
        "users",
        "password_hash",
        server_default=None,
    )

    op.alter_column(
        "users",
        "must_change_password",
        server_default=None,
    )