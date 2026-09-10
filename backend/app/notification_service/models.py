from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    Index,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.notification_service.enums import NotificationType


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    message: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    notification_type: Mapped[NotificationType] = mapped_column(
        SQLEnum(NotificationType, name="notification_type"),
        nullable=False,
        index=True,
    )

    reference_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    reference_type: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    is_read: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    read_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    user = relationship("User", backref="notifications")


Index(
    "ix_notifications_user_read_created",
    Notification.user_id,
    Notification.is_read,
    Notification.created_at,
)
