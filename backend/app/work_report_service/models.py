from datetime import date, datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.employee_service.models import Employee
    from app.project_service.models import Project


class DailyWorkReport(Base):
    __tablename__ = "daily_work_reports"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    work_description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    problems_faced: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    document_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )

    document_public_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )

    document_name: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )

    report_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
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

    # Relationships
    employee: Mapped["Employee"] = relationship("Employee")
    project: Mapped["Project"] = relationship("Project")

    __table_args__ = (
        UniqueConstraint(
            "employee_id",
            "project_id",
            "report_date",
            name="uq_daily_work_reports_emp_proj_date",
        ),
        Index(
            "ix_daily_work_reports_emp_date",
            "employee_id",
            "report_date",
        ),
    )
