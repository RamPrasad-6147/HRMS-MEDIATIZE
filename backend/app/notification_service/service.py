from datetime import datetime, timezone
import math
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.authentication_service.models import User, UserRole
from app.notification_service.enums import NotificationType
from app.notification_service.models import Notification
from app.notification_service.schemas import (
    NotificationPaginatedResponse,
    NotificationResponse,
)


def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    notification_type: NotificationType,
    reference_id: Optional[str] = None,
    reference_type: Optional[str] = None,
) -> Notification:
    """
    Create a single notification for a specific recipient user_id.
    """
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notification_type,
        reference_id=str(reference_id) if reference_id is not None else None,
        reference_type=reference_type,
        is_read=False,
        created_at=datetime.now(timezone.utc),
    )
    db.add(notification)
    db.flush()
    return notification


def notify_users(
    db: Session,
    user_ids: List[int],
    title: str,
    message: str,
    notification_type: NotificationType,
    reference_id: Optional[str] = None,
    reference_type: Optional[str] = None,
) -> List[Notification]:
    """
    Create notifications for a list of user_ids.
    """
    notifications = []
    for uid in set(user_ids):
        n = create_notification(
            db=db,
            user_id=uid,
            title=title,
            message=message,
            notification_type=notification_type,
            reference_id=reference_id,
            reference_type=reference_type,
        )
        notifications.append(n)
    return notifications


def notify_all_hr(
    db: Session,
    title: str,
    message: str,
    notification_type: NotificationType,
    reference_id: Optional[str] = None,
    reference_type: Optional[str] = None,
) -> List[Notification]:
    """
    Find all active HR users and create notifications for them.
    """
    hr_users = db.scalars(
        select(User).where(
            User.role == UserRole.HR,
            User.is_active == True,
        )
    ).all()

    hr_user_ids = [u.id for u in hr_users]
    return notify_users(
        db=db,
        user_ids=hr_user_ids,
        title=title,
        message=message,
        notification_type=notification_type,
        reference_id=reference_id,
        reference_type=reference_type,
    )


def get_user_notifications(
    db: Session,
    current_user: User,
    page: int = 1,
    limit: int = 20,
    unread_only: bool = False,
) -> NotificationPaginatedResponse:
    """
    Get paginated notifications belonging exclusively to the current user.
    """
    base_query = select(Notification).where(Notification.user_id == current_user.id)

    if unread_only:
        base_query = base_query.where(Notification.is_read == False)

    # Count total matching records
    total_stmt = select(func.count()).select_from(base_query.subquery())
    total = db.scalar(total_stmt) or 0

    # Count overall unread notifications for user badge
    unread_count_stmt = select(func.count(Notification.id)).where(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    )
    unread_count = db.scalar(unread_count_stmt) or 0

    # Fetch paginated items
    offset = (page - 1) * limit
    items_stmt = (
        base_query.order_by(Notification.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    items = list(db.scalars(items_stmt).all())

    pages = math.ceil(total / limit) if total > 0 else 0

    return NotificationPaginatedResponse(
        items=[NotificationResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        limit=limit,
        pages=pages,
        unread_count=unread_count,
    )


def get_unread_count(
    db: Session,
    current_user: User,
) -> int:
    """
    Get unread notification count for current user.
    """
    stmt = select(func.count(Notification.id)).where(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    )
    return db.scalar(stmt) or 0


def mark_as_read(
    db: Session,
    notification_id: int,
    current_user: User,
) -> Notification:
    """
    Mark a single notification as read.
    IDOR Protection: Ensures notification belongs to current_user.id.
    """
    stmt = select(Notification).where(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    )
    notification = db.scalar(stmt)

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    if not notification.is_read:
        notification.is_read = True
        notification.read_at = datetime.now(timezone.utc)
        db.flush()

    return notification


def mark_all_as_read(
    db: Session,
    current_user: User,
) -> int:
    """
    Mark all unread notifications for current_user as read.
    Returns count of updated records.
    """
    now = datetime.now(timezone.utc)
    stmt = (
        update(Notification)
        .where(
            Notification.user_id == current_user.id,
            Notification.is_read == False,
        )
        .values(
            is_read=True,
            read_at=now,
        )
    )
    result = db.execute(stmt)
    db.flush()
    return result.rowcount
