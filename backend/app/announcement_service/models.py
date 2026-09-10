from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.announcement_service.enums import (
    AnnouncementPriority,
    AnnouncementScope,
    AnnouncementStatus,
    AnnouncementType,
)

if TYPE_CHECKING:
    from app.authentication_service.models import User
    from app.employee_service.models import Employee
    from app.project_service.models import Project


class Announcement(Base):
    __tablename__ = "announcements"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    announcement_type: Mapped[AnnouncementType] = mapped_column(
        SQLEnum(AnnouncementType, name="announcement_type"),
        nullable=False,
        default=AnnouncementType.GENERAL,
        index=True,
    )

    priority: Mapped[AnnouncementPriority] = mapped_column(
        SQLEnum(AnnouncementPriority, name="announcement_priority"),
        nullable=False,
        default=AnnouncementPriority.NORMAL,
        index=True,
    )

    status: Mapped[AnnouncementStatus] = mapped_column(
        SQLEnum(AnnouncementStatus, name="announcement_status"),
        nullable=False,
        default=AnnouncementStatus.DRAFT,
        index=True,
    )

    announcement_scope: Mapped[AnnouncementScope] = mapped_column(
        SQLEnum(AnnouncementScope, name="announcement_scope"),
        nullable=False,
        default=AnnouncementScope.COMPANY,
        index=True,
    )

    project_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    published_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
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

    archived_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    project: Mapped[Optional["Project"]] = relationship("Project")
    creator: Mapped[Optional["User"]] = relationship("User")
    reads: Mapped[List["AnnouncementRead"]] = relationship(
        "AnnouncementRead",
        back_populates="announcement",
        cascade="all, delete-orphan",
    )


class AnnouncementRead(Base):
    __tablename__ = "announcement_reads"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    announcement_id: Mapped[int] = mapped_column(
        ForeignKey("announcements.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    read_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    announcement: Mapped["Announcement"] = relationship(
        "Announcement", back_populates="reads"
    )
    employee: Mapped["Employee"] = relationship("Employee")

    __table_args__ = (
        UniqueConstraint(
            "announcement_id",
            "employee_id",
            name="uq_announcement_employee_read",
        ),
    )
