from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.announcement_service.enums import (
    AnnouncementPriority,
    AnnouncementScope,
    AnnouncementStatus,
    AnnouncementType,
)
from app.announcement_service.schemas import (
    AnnouncementCreate,
    AnnouncementListPaginated,
    AnnouncementReadResponse,
    AnnouncementResponse,
    AnnouncementUpdate,
    ProjectSearchResponse,
)
from app.announcement_service.service import (
    archive_announcement,
    create_announcement,
    get_announcement_by_id,
    get_announcements_for_employee,
    get_announcements_for_hr,
    mark_announcement_as_read,
    publish_announcement,
    search_projects_for_announcements,
    update_announcement,
)
from app.authentication_service.dependencies import (
    get_current_hr,
    get_current_user,
)
from app.authentication_service.models import User
from app.core.database import get_db


router = APIRouter(
    prefix="/announcements",
    tags=["Announcements"],
)


@router.get(
    "/projects/search",
    response_model=List[ProjectSearchResponse],
    status_code=status.HTTP_200_OK,
)
def search_projects_for_announcements_endpoint(
    search: Optional[str] = Query(
        None,
        description="Search by project name or project code",
    ),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_hr: User = Depends(get_current_hr),
):
    """
    Search projects for HR when selecting a project for a
    Project Announcement.

    HR Only.
    """

    return search_projects_for_announcements(
        db=db,
        search=search,
        limit=limit,
    )


@router.post(
    "",
    response_model=AnnouncementResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_announcement_endpoint(
    data: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_hr: User = Depends(get_current_hr),
):
    """
    Create a new announcement (Draft or Direct Publish).

    HR Only.
    """

    return create_announcement(
        db=db,
        data=data,
        current_user=current_hr,
    )


@router.get(
    "/hr",
    response_model=AnnouncementListPaginated,
    status_code=status.HTTP_200_OK,
)
def get_announcements_for_hr_endpoint(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    scope: Optional[AnnouncementScope] = Query(None),
    status_filter: Optional[AnnouncementStatus] = Query(
        None,
        alias="status",
    ),
    announcement_type: Optional[AnnouncementType] = Query(None),
    project_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_hr: User = Depends(get_current_hr),
):
    """
    Retrieve all announcements for HR with pagination and filters.

    HR Only.
    """

    return get_announcements_for_hr(
        db=db,
        current_user=current_hr,
        page=page,
        limit=limit,
        scope=scope,
        status_filter=status_filter,
        announcement_type=announcement_type,
        project_id=project_id,
        search=search,
    )


@router.get(
    "/employee",
    response_model=AnnouncementListPaginated,
    status_code=status.HTTP_200_OK,
)
def get_announcements_for_employee_endpoint(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    scope: Optional[AnnouncementScope] = Query(None),
    announcement_type: Optional[AnnouncementType] = Query(None),
    unread_only: bool = Query(False),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve authorized employee announcements feed.

    Authentication is JWT-based after successful OTP
    verification. IDOR protection remains enforced by
    the announcement service.
    """

    return get_announcements_for_employee(
        db=db,
        current_user=current_user,
        page=page,
        limit=limit,
        scope=scope,
        announcement_type=announcement_type,
        unread_only=unread_only,
        search=search,
    )


@router.get(
    "/{announcement_id}",
    response_model=AnnouncementResponse,
    status_code=status.HTTP_200_OK,
)
def get_announcement_by_id_endpoint(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve single announcement details.

    Authentication is JWT-based after successful OTP
    verification. IDOR protection remains enforced by
    the announcement service.
    """

    return get_announcement_by_id(
        db=db,
        announcement_id=announcement_id,
        current_user=current_user,
    )


@router.put(
    "/{announcement_id}",
    response_model=AnnouncementResponse,
    status_code=status.HTTP_200_OK,
)
def update_announcement_endpoint(
    announcement_id: int,
    data: AnnouncementUpdate,
    db: Session = Depends(get_db),
    current_hr: User = Depends(get_current_hr),
):
    """
    Update announcement details.

    HR Only.
    """

    return update_announcement(
        db=db,
        announcement_id=announcement_id,
        data=data,
        current_user=current_hr,
    )


@router.post(
    "/{announcement_id}/publish",
    response_model=AnnouncementResponse,
    status_code=status.HTTP_200_OK,
)
def publish_announcement_endpoint(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_hr: User = Depends(get_current_hr),
):
    """
    Publish draft announcement.

    HR Only.
    """

    return publish_announcement(
        db=db,
        announcement_id=announcement_id,
        current_user=current_hr,
    )


@router.post(
    "/{announcement_id}/archive",
    response_model=AnnouncementResponse,
    status_code=status.HTTP_200_OK,
)
def archive_announcement_endpoint(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_hr: User = Depends(get_current_hr),
):
    """
    Archive an announcement.

    HR Only.
    """

    return archive_announcement(
        db=db,
        announcement_id=announcement_id,
        current_user=current_hr,
    )


@router.post(
    "/{announcement_id}/read",
    response_model=AnnouncementReadResponse,
    status_code=status.HTTP_200_OK,
)
def mark_announcement_as_read_endpoint(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mark announcement as read.

    Read records are created on demand.
    IDOR protection remains enforced by the
    announcement service.
    """

    return mark_announcement_as_read(
        db=db,
        announcement_id=announcement_id,
        current_user=current_user,
    )