from datetime import datetime, timezone
from enum import Enum
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.employee_service.models import Employee


class ComplaintPriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


class ComplaintStatus(str, Enum):
    OPEN = "OPEN"
    UNDER_REVIEW = "UNDER_REVIEW"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"
    REJECTED = "REJECTED"


class ComplaintCategory(Base):
    __tablename__ = "complaint_categories"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    name: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
    )

    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        index=True,
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


class Complaint(Base):
    __tablename__ = "complaints"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    complaint_code: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        nullable=False,
        index=True,
    )

    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    category_id: Mapped[int] = mapped_column(
        ForeignKey("complaint_categories.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    subject: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    priority: Mapped[ComplaintPriority] = mapped_column(
        SQLEnum(ComplaintPriority, name="complaint_priority"),
        nullable=False,
        default=ComplaintPriority.MEDIUM,
        index=True,
    )

    status: Mapped[ComplaintStatus] = mapped_column(
        SQLEnum(ComplaintStatus, name="complaint_status"),
        nullable=False,
        default=ComplaintStatus.OPEN,
        index=True,
    )

    hr_response: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    resolution: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    attachment_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )

    attachment_public_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )

    attachment_name: Mapped[Optional[str]] = mapped_column(
        String(255),
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

    resolved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    closed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    employee: Mapped["Employee"] = relationship(
        "Employee",
        foreign_keys=[employee_id],
        lazy="joined",
    )

    category: Mapped["ComplaintCategory"] = relationship(
        "ComplaintCategory",
        foreign_keys=[category_id],
        lazy="joined",
    )


Index("ix_complaints_emp_created", Complaint.employee_id, Complaint.created_at)
