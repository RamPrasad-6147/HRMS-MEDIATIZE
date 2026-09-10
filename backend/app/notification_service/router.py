from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.authentication_service.dependencies import get_current_user
from app.authentication_service.models import User
from app.core.database import get_db
from app.notification_service import service
from app.notification_service.schemas import (
    MarkAllReadResponse,
    NotificationPaginatedResponse,
    NotificationResponse,
    UnreadCountResponse,
)

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


@router.get(
    "",
    response_model=NotificationPaginatedResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Current User Notifications",
)
def get_my_notifications(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(
        20,
        ge=1,
        le=100,
        description="Items per page",
    ),
    unread_only: bool = Query(
        False,
        description="Filter unread only",
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.get_user_notifications(
        db=db,
        current_user=current_user,
        page=page,
        limit=limit,
        unread_only=unread_only,
    )


@router.get(
    "/unread-count",
    response_model=UnreadCountResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Unread Notification Count",
)
def get_my_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = service.get_unread_count(
        db=db,
        current_user=current_user,
    )

    return UnreadCountResponse(
        unread_count=count,
    )


@router.patch(
    "/read-all",
    response_model=MarkAllReadResponse,
    status_code=status.HTTP_200_OK,
    summary="Mark All Notifications as Read",
)
def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    updated_count = service.mark_all_as_read(
        db=db,
        current_user=current_user,
    )

    db.commit()

    return MarkAllReadResponse(
        updated_count=updated_count,
        message="All notifications marked as read",
    )


@router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse,
    status_code=status.HTTP_200_OK,
    summary="Mark Notification as Read",
)
def mark_single_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notification = service.mark_as_read(
        db=db,
        notification_id=notification_id,
        current_user=current_user,
    )

    db.commit()

    return notification