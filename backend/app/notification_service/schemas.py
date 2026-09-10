from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict

from app.notification_service.enums import NotificationType


class NotificationCreate(BaseModel):
    user_id: int
    title: str
    message: str
    notification_type: NotificationType
    reference_id: Optional[str] = None
    reference_type: Optional[str] = None


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str
    message: str
    notification_type: NotificationType
    reference_id: Optional[str] = None
    reference_type: Optional[str] = None
    is_read: bool
    created_at: datetime
    read_at: Optional[datetime] = None


class UnreadCountResponse(BaseModel):
    unread_count: int


class NotificationPaginatedResponse(BaseModel):
    items: List[NotificationResponse]
    total: int
    page: int
    limit: int
    pages: int
    unread_count: int


class MarkAllReadResponse(BaseModel):
    updated_count: int
    message: str
