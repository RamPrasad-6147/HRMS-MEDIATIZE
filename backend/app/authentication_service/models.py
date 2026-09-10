from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    Index,
    Integer,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class UserRole(str, Enum):
    HR = "HR"
    EMPLOYEE = "EMPLOYEE"


class EmailOTPPurpose(str, Enum):
    """
    Defines why an OTP was generated.
    """

    LOGIN = "LOGIN"
    EMAIL_CHANGE = "EMAIL_CHANGE"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )

    employee_id: Mapped[str | None] = mapped_column(
        String(50),
        unique=True,
        nullable=True,
        index=True,
    )

    role: Mapped[UserRole] = mapped_column(
        SQLEnum(
            UserRole,
            name="user_role",
        ),
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )


class EmailOTP(Base):
    __tablename__ = "email_otps"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    purpose: Mapped[EmailOTPPurpose] = mapped_column(
        SQLEnum(
            EmailOTPPurpose,
            name="email_otp_purpose",
        ),
        nullable=False,
        default=EmailOTPPurpose.LOGIN,
        index=True,
    )

    otp_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )

    used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    attempt_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    requested_ip: Mapped[str | None] = mapped_column(
        String(45),
        nullable=True,
    )

    target_email: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )


Index(
    "ix_users_role",
    User.role,
)

Index(
    "ix_email_otps_user_purpose_created_at",
    EmailOTP.user_id,
    EmailOTP.purpose,
    EmailOTP.created_at,
)