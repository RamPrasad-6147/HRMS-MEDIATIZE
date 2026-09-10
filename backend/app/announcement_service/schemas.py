from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.announcement_service.enums import (
    AnnouncementPriority,
    AnnouncementScope,
    AnnouncementStatus,
    AnnouncementType,
)


class AnnouncementCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="Announcement title")
    content: str = Field(..., min_length=1, description="Announcement message content")
    announcement_type: AnnouncementType = Field(default=AnnouncementType.GENERAL)
    priority: AnnouncementPriority = Field(default=AnnouncementPriority.NORMAL)
    announcement_scope: AnnouncementScope = Field(default=AnnouncementScope.COMPANY)
    project_id: Optional[int] = Field(default=None, description="Must be provided only if scope is PROJECT")
    expires_at: Optional[datetime] = Field(default=None, description="Optional expiry timestamp")
    publish_now: bool = Field(default=False, description="If true, sets status to PUBLISHED immediately")

    @field_validator("project_id")
    @classmethod
    def validate_project_scope(cls, v: Optional[int], info) -> Optional[int]:
        scope = info.data.get("announcement_scope")
        if scope == AnnouncementScope.COMPANY and v is not None:
            raise ValueError("project_id must be NULL for COMPANY scope announcements.")
        if scope == AnnouncementScope.PROJECT and v is None:
            raise ValueError("project_id is required for PROJECT scope announcements.")
        return v


class AnnouncementUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    content: Optional[str] = Field(default=None, min_length=1)
    announcement_type: Optional[AnnouncementType] = None
    priority: Optional[AnnouncementPriority] = None
    expires_at: Optional[datetime] = None


class ProjectSearchResponse(BaseModel):
    id: int
    project_code: str
    name: str
    status: str
    member_count: int

    model_config = ConfigDict(from_attributes=True)


class AnnouncementResponse(BaseModel):
    id: int
    title: str
    content: str
    announcement_type: AnnouncementType
    priority: AnnouncementPriority
    status: AnnouncementStatus
    announcement_scope: AnnouncementScope
    project_id: Optional[int] = None
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    published_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_by: Optional[int] = None
    creator_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    archived_at: Optional[datetime] = None
    is_read: bool = False
    read_at: Optional[datetime] = None
    read_count: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class AnnouncementReadResponse(BaseModel):
    id: int
    announcement_id: int
    employee_id: int
    read_at: datetime
    message: str = "Announcement marked as read."

    model_config = ConfigDict(from_attributes=True)


class AnnouncementListPaginated(BaseModel):
    items: List[AnnouncementResponse]
    page: int
    limit: int
    total: int
    total_pages: int
    unread_count: int = 0
