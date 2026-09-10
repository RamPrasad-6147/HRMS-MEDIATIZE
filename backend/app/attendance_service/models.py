from datetime import date, datetime, timezone
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import (
    Date,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    Index,
    Integer,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.employee_service.models import Employee


class AttendanceStatus(str, Enum):
    PRESENT = "PRESENT"
    LATE = "LATE"


class Attendance(Base):
    __tablename__ = "attendance"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id"),
        nullable=False,
        index=True,
    )

    attendance_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        index=True,
    )

    check_in: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    check_out: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    status: Mapped[AttendanceStatus] = mapped_column(
        SQLEnum(AttendanceStatus, name="attendance_status"),
        nullable=False,
        default=AttendanceStatus.PRESENT,
        index=True,
    )

    working_minutes: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
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

    # 1:1 / N:1 relationship with Employee
    employee: Mapped["Employee"] = relationship(
        "Employee",
        foreign_keys=[employee_id],
        lazy="joined",
    )

    __table_args__ = (
        UniqueConstraint(
            "employee_id",
            "attendance_date",
            name="uq_attendance_employee_date",
        ),
        Index("ix_attendance_employee_id_date", "employee_id", "attendance_date"),
    )
