from datetime import date, datetime, timezone
from enum import Enum
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
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
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.authentication_service.models import User
    from app.employee_service.models import Employee


class ReviewStatus(str, Enum):
    DRAFT = "DRAFT"
    COMPLETED = "COMPLETED"


class GoalStatus(str, Enum):
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class PerformanceReview(Base):
    __tablename__ = "performance_reviews"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    review_start_date: Mapped[date] = mapped_column(Date, nullable=False)
    review_end_date: Mapped[date] = mapped_column(Date, nullable=False)

    status: Mapped[ReviewStatus] = mapped_column(
        SQLEnum(ReviewStatus, name="review_status"),
        nullable=False,
        default=ReviewStatus.DRAFT,
        index=True,
    )

    overall_rating: Mapped[Optional[float]] = mapped_column(
        Numeric(3, 1),
        nullable=True,
    )

    overall_feedback: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    created_by: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
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

    # Relationships
    employee: Mapped["Employee"] = relationship("Employee")
    creator: Mapped[Optional["User"]] = relationship("User")
    ratings: Mapped[List["PerformanceReviewRating"]] = relationship(
        "PerformanceReviewRating",
        back_populates="review",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        CheckConstraint(
            "review_start_date <= review_end_date",
            name="chk_review_dates",
        ),
        Index("ix_performance_reviews_dates", "review_start_date", "review_end_date"),
    )


class PerformanceReviewRating(Base):
    __tablename__ = "performance_review_ratings"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    review_id: Mapped[int] = mapped_column(
        ForeignKey("performance_reviews.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    category: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    rating: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    comments: Mapped[Optional[str]] = mapped_column(
        Text,
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

    # Relationship
    review: Mapped["PerformanceReview"] = relationship("PerformanceReview", back_populates="ratings")

    __table_args__ = (
        CheckConstraint(
            "rating >= 1 AND rating <= 5",
            name="chk_rating_range",
        ),
    )


class PerformanceGoal(Base):
    __tablename__ = "performance_goals"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    target_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        index=True,
    )

    status: Mapped[GoalStatus] = mapped_column(
        SQLEnum(GoalStatus, name="goal_status"),
        nullable=False,
        default=GoalStatus.NOT_STARTED,
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

    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
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

    # Relationships
    employee: Mapped["Employee"] = relationship("Employee")
    creator: Mapped[Optional["User"]] = relationship("User")

    __table_args__ = (
        CheckConstraint(
            "progress_percentage >= 0 AND progress_percentage <= 100",
            name="chk_goal_progress_range",
        ),
    )
