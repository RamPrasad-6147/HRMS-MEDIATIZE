from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.leave_service.enums import LeaveDayType, LeaveStatus


class LeaveType(Base):
    __tablename__ = "leave_types"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    name: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    annual_allocation: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    is_paid: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    requires_document: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
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

    __table_args__ = (
        CheckConstraint("annual_allocation >= 0", name="chk_leave_types_allocation_positive"),
    )


class LeaveBalance(Base):
    __tablename__ = "leave_balances"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    leave_type_id: Mapped[int] = mapped_column(
        ForeignKey("leave_types.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    year: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        index=True,
    )

    allocated_days: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    used_days: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    pending_days: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        default=Decimal("0.00"),
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

    employee = relationship("Employee", backref="leave_balances")
    leave_type = relationship("LeaveType", backref="leave_balances")

    __table_args__ = (
        UniqueConstraint("employee_id", "leave_type_id", "year", name="uq_leave_balance_employee_type_year"),
        CheckConstraint("allocated_days >= 0", name="chk_leave_balance_allocated_positive"),
        CheckConstraint("used_days >= 0", name="chk_leave_balance_used_positive"),
        CheckConstraint("pending_days >= 0", name="chk_leave_balance_pending_positive"),
        CheckConstraint("used_days + pending_days <= allocated_days", name="chk_leave_balance_total_usage"),
    )


class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    leave_type_id: Mapped[int] = mapped_column(
        ForeignKey("leave_types.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    start_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        index=True,
    )

    end_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        index=True,
    )

    duration: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False,
    )

    start_day_type: Mapped[LeaveDayType] = mapped_column(
        SQLEnum(LeaveDayType, name="leave_day_type"),
        nullable=False,
        default=LeaveDayType.FULL_DAY,
    )

    end_day_type: Mapped[LeaveDayType] = mapped_column(
        SQLEnum(LeaveDayType, name="leave_day_type"),
        nullable=False,
        default=LeaveDayType.FULL_DAY,
    )

    reason: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    status: Mapped[LeaveStatus] = mapped_column(
        SQLEnum(LeaveStatus, name="leave_status"),
        nullable=False,
        default=LeaveStatus.PENDING,
        index=True,
    )

    hr_remarks: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    reviewed_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    cancellation_reason: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    cancelled_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    cancelled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    revocation_reason: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    revoked_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    employee = relationship("Employee", backref="leave_requests")
    leave_type = relationship("LeaveType", backref="leave_requests")
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    canceller = relationship("User", foreign_keys=[cancelled_by])
    revoker = relationship("User", foreign_keys=[revoked_by])
    attachments: Mapped[List["LeaveAttachment"]] = relationship(
        "LeaveAttachment",
        backref="leave_request",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        CheckConstraint("start_date <= end_date", name="chk_leave_requests_dates"),
        CheckConstraint("duration > 0", name="chk_leave_requests_duration"),
        Index("ix_leave_requests_employee_status", "employee_id", "status"),
        Index("ix_leave_requests_dates", "start_date", "end_date"),
    )


class LeaveAttachment(Base):
    __tablename__ = "leave_attachments"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    leave_request_id: Mapped[int] = mapped_column(
        ForeignKey("leave_requests.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    file_url: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    public_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    original_filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    content_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    file_size: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
