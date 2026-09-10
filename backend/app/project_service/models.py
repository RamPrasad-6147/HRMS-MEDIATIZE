from datetime import date, datetime, timezone
from enum import Enum
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
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
    from app.authentication_service.models import User
    from app.employee_service.models import Employee


class ProjectPriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class ProjectStatus(str, Enum):
    PLANNED = "PLANNED"
    IN_PROGRESS = "IN_PROGRESS"
    ON_HOLD = "ON_HOLD"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class AssignmentStatus(str, Enum):
    ACTIVE = "ACTIVE"
    REMOVED = "REMOVED"


class ProjectRole(Base):
    __tablename__ = "project_roles"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
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
    assignments: Mapped[List["ProjectAssignment"]] = relationship(
        "ProjectAssignment", back_populates="project_role"
    )


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    priority: Mapped[ProjectPriority] = mapped_column(
        SQLEnum(ProjectPriority, name="project_priority"),
        nullable=False,
        default=ProjectPriority.MEDIUM,
        index=True,
    )

    status: Mapped[ProjectStatus] = mapped_column(
        SQLEnum(ProjectStatus, name="project_status"),
        nullable=False,
        default=ProjectStatus.PLANNED,
        index=True,
    )

    progress_percentage: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    created_by: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
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
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    creator: Mapped[Optional["User"]] = relationship("User")
    assignments: Mapped[List["ProjectAssignment"]] = relationship(
        "ProjectAssignment", back_populates="project", cascade="all, delete-orphan"
    )

    __table_args__ = (
        CheckConstraint(
            "progress_percentage >= 0 AND progress_percentage <= 100",
            name="chk_project_progress_range",
        ),
    )


class ProjectAssignment(Base):
    __tablename__ = "project_assignments"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    project_role_id: Mapped[int] = mapped_column(
        ForeignKey("project_roles.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    assigned_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        default=lambda: date.today(),
    )

    removed_date: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True,
    )

    status: Mapped[AssignmentStatus] = mapped_column(
        SQLEnum(AssignmentStatus, name="assignment_status"),
        nullable=False,
        default=AssignmentStatus.ACTIVE,
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
    project: Mapped["Project"] = relationship("Project", back_populates="assignments")
    employee: Mapped["Employee"] = relationship("Employee")
    project_role: Mapped["ProjectRole"] = relationship("ProjectRole", back_populates="assignments")
