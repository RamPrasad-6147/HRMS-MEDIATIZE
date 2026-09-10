from datetime import datetime, timezone
import logging
import math
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status
from sqlalchemy import and_, desc, func, or_, select
from sqlalchemy.orm import Session

from app.announcement_service.enums import (
    AnnouncementPriority,
    AnnouncementScope,
    AnnouncementStatus,
    AnnouncementType,
)
from app.announcement_service.models import Announcement, AnnouncementRead
from app.announcement_service.schemas import (
    AnnouncementCreate,
    AnnouncementListPaginated,
    AnnouncementReadResponse,
    AnnouncementResponse,
    AnnouncementUpdate,
    ProjectSearchResponse,
)
from app.audit_service.models import AuditAction
from app.audit_service.service import create_audit_log
from app.authentication_service.models import User, UserRole
from app.core.config import settings
from app.email_service.service import send_announcement_email
from app.employee_service.models import Employee, EmploymentStatus
from app.notification_service.enums import NotificationType
from app.notification_service.service import notify_users
from app.project_service.models import AssignmentStatus, Project, ProjectAssignment

logger = logging.getLogger(__name__)



def search_projects_for_announcements(
    db: Session,
    search: Optional[str] = None,
    limit: int = 20,
) -> List[ProjectSearchResponse]:
    """
    Search projects for HR when selecting a project for a Project Announcement.
    Returns project summary with active member count.
    """
    limit = max(1, min(50, limit))

    query = (
        select(
            Project.id,
            Project.project_code,
            Project.name,
            Project.status,
            func.count(ProjectAssignment.id).label("member_count"),
        )
        .outerjoin(
            ProjectAssignment,
            and_(
                ProjectAssignment.project_id == Project.id,
                ProjectAssignment.status == AssignmentStatus.ACTIVE,
            ),
        )
        .where(Project.deleted_at.is_(None))
        .group_by(Project.id, Project.project_code, Project.name, Project.status)
        .order_by(Project.name.asc())
    )

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(
            or_(
                Project.name.ilike(term),
                Project.project_code.ilike(term),
            )
        )

    results = db.execute(query.limit(limit)).all()

    return [
        ProjectSearchResponse(
            id=row.id,
            project_code=row.project_code,
            name=row.name,
            status=str(row.status.value if hasattr(row.status, "value") else row.status),
            member_count=row.member_count or 0,
        )
        for row in results
    ]


def _format_announcement_response(
    db: Session,
    announcement: Announcement,
    employee_id: Optional[int] = None,
    is_hr: bool = False,
) -> AnnouncementResponse:
    """Helper to format Announcement into AnnouncementResponse."""
    creator_name = None
    if announcement.created_by:
        creator_user = db.scalar(select(User).where(User.id == announcement.created_by))
        if creator_user:
            creator_emp = db.scalar(select(Employee).where(Employee.user_id == creator_user.id))
            if creator_emp:
                creator_name = f"{creator_emp.first_name} {creator_emp.last_name}".strip()
            else:
                creator_name = creator_user.email

    project_name = None
    project_code = None
    if announcement.project_id and announcement.project:
        project_name = announcement.project.name
        project_code = announcement.project.project_code
    elif announcement.project_id:
        proj = db.scalar(select(Project).where(Project.id == announcement.project_id))
        if proj:
            project_name = proj.name
            project_code = proj.project_code

    is_read = False
    read_at = None
    if employee_id:
        read_rec = db.scalar(
            select(AnnouncementRead).where(
                AnnouncementRead.announcement_id == announcement.id,
                AnnouncementRead.employee_id == employee_id,
            )
        )
        if read_rec:
            is_read = True
            read_at = read_rec.read_at

    read_count = None
    if is_hr:
        read_count = db.scalar(
            select(func.count(AnnouncementRead.id)).where(
                AnnouncementRead.announcement_id == announcement.id
            )
        ) or 0

    return AnnouncementResponse(
        id=announcement.id,
        title=announcement.title,
        content=announcement.content,
        announcement_type=announcement.announcement_type,
        priority=announcement.priority,
        status=announcement.status,
        announcement_scope=announcement.announcement_scope,
        project_id=announcement.project_id,
        project_name=project_name,
        project_code=project_code,
        published_at=announcement.published_at,
        expires_at=announcement.expires_at,
        created_by=announcement.created_by,
        creator_name=creator_name,
        created_at=announcement.created_at,
        updated_at=announcement.updated_at,
        archived_at=announcement.archived_at,
        is_read=is_read,
        read_at=read_at,
        read_count=read_count,
    )


def create_announcement(
    db: Session,
    data: AnnouncementCreate,
    current_user: User,
) -> AnnouncementResponse:
    """
    Create a new Announcement (Draft or Published).
    HR Only.
    """
    if current_user.role != UserRole.HR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HR can create announcements.",
        )

    # Validate project association
    if data.announcement_scope == AnnouncementScope.COMPANY:
        if data.project_id is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="COMPANY scope announcement must not have a project_id.",
            )
    elif data.announcement_scope == AnnouncementScope.PROJECT:
        if data.project_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="PROJECT scope announcement requires a valid project_id.",
            )
        proj = db.scalar(
            select(Project).where(
                Project.id == data.project_id,
                Project.deleted_at.is_(None),
            )
        )
        if not proj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project with ID {data.project_id} not found.",
            )

    now = datetime.now(timezone.utc)
    status_enum = (
        AnnouncementStatus.PUBLISHED
        if data.publish_now
        else AnnouncementStatus.DRAFT
    )
    published_at = now if data.publish_now else None

    announcement = Announcement(
        title=data.title.strip(),
        content=data.content.strip(),
        announcement_type=data.announcement_type,
        priority=data.priority,
        status=status_enum,
        announcement_scope=data.announcement_scope,
        project_id=data.project_id,
        published_at=published_at,
        expires_at=data.expires_at,
        created_by=current_user.id,
        created_at=now,
        updated_at=now,
    )

    db.add(announcement)
    db.flush()

    # Audit log
    create_audit_log(
        db=db,
        user_id=current_user.id,
        action=AuditAction.ANNOUNCEMENT_CREATED,
    )

    if data.publish_now:
        create_audit_log(
            db=db,
            user_id=current_user.id,
            action=AuditAction.ANNOUNCEMENT_PUBLISHED,
        )
        _dispatch_announcement_notifications(db, announcement)

    db.commit()
    db.refresh(announcement)

    return _format_announcement_response(db, announcement, is_hr=True)


def update_announcement(
    db: Session,
    announcement_id: int,
    data: AnnouncementUpdate,
    current_user: User,
) -> AnnouncementResponse:
    """
    Update an existing Announcement. HR Only.
    """
    if current_user.role != UserRole.HR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HR can update announcements.",
        )

    announcement = db.scalar(
        select(Announcement).where(Announcement.id == announcement_id)
    )
    if not announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Announcement not found.",
        )

    if announcement.status == AnnouncementStatus.ARCHIVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Archived announcements cannot be modified.",
        )

    if data.title is not None:
        announcement.title = data.title.strip()
    if data.content is not None:
        announcement.content = data.content.strip()
    if data.announcement_type is not None:
        announcement.announcement_type = data.announcement_type
    if data.priority is not None:
        announcement.priority = data.priority
    if data.expires_at is not None:
        announcement.expires_at = data.expires_at

    announcement.updated_at = datetime.now(timezone.utc)
    db.flush()

    create_audit_log(
        db=db,
        user_id=current_user.id,
        action=AuditAction.ANNOUNCEMENT_UPDATED,
    )

    db.commit()
    db.refresh(announcement)

    return _format_announcement_response(db, announcement, is_hr=True)


def publish_announcement(
    db: Session,
    announcement_id: int,
    current_user: User,
) -> AnnouncementResponse:
    """
    Publish a draft announcement. HR Only.
    """
    if current_user.role != UserRole.HR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HR can publish announcements.",
        )

    announcement = db.scalar(
        select(Announcement).where(Announcement.id == announcement_id)
    )
    if not announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Announcement not found.",
        )

    if announcement.status == AnnouncementStatus.ARCHIVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Archived announcements cannot be published.",
        )

    if announcement.status == AnnouncementStatus.PUBLISHED:
        # Already published
        return _format_announcement_response(db, announcement, is_hr=True)

    now = datetime.now(timezone.utc)
    announcement.status = AnnouncementStatus.PUBLISHED
    announcement.published_at = now
    announcement.updated_at = now
    db.flush()

    create_audit_log(
        db=db,
        user_id=current_user.id,
        action=AuditAction.ANNOUNCEMENT_PUBLISHED,
    )

    _dispatch_announcement_notifications(db, announcement)

    db.commit()
    db.refresh(announcement)

    return _format_announcement_response(db, announcement, is_hr=True)


def archive_announcement(
    db: Session,
    announcement_id: int,
    current_user: User,
) -> AnnouncementResponse:
    """
    Archive an announcement. HR Only.
    """
    if current_user.role != UserRole.HR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HR can archive announcements.",
        )

    announcement = db.scalar(
        select(Announcement).where(Announcement.id == announcement_id)
    )
    if not announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Announcement not found.",
        )

    if announcement.status == AnnouncementStatus.ARCHIVED:
        return _format_announcement_response(db, announcement, is_hr=True)

    now = datetime.now(timezone.utc)
    announcement.status = AnnouncementStatus.ARCHIVED
    announcement.archived_at = now
    announcement.updated_at = now
    db.flush()

    create_audit_log(
        db=db,
        user_id=current_user.id,
        action=AuditAction.ANNOUNCEMENT_ARCHIVED,
    )

    db.commit()
    db.refresh(announcement)

    return _format_announcement_response(db, announcement, is_hr=True)


def _dispatch_announcement_notifications(
    db: Session,
    announcement: Announcement,
):
    """
    Helper to send in-app notifications and HTML emails when an announcement is published.
    """
    # 1. Resolve project details if project-scoped
    project = None
    if announcement.announcement_scope == AnnouncementScope.PROJECT and announcement.project_id:
        project = announcement.project or db.get(Project, announcement.project_id)

    notification_type = (
        NotificationType.PROJECT_ANNOUNCEMENT
        if announcement.announcement_scope == AnnouncementScope.PROJECT
        else NotificationType.COMPANY_ANNOUNCEMENT
    )

    proj_code = project.project_code if project else ""
    title_prefix = f"[{announcement.announcement_scope.value}]"
    if announcement.announcement_scope == AnnouncementScope.PROJECT and proj_code:
        title_prefix = f"[PROJECT • {proj_code}]"

    notif_title = f"{title_prefix} {announcement.title}"
    notif_msg = announcement.content

    # 2. Fetch active eligible employee records
    active_employees: List[Employee] = []

    if announcement.announcement_scope == AnnouncementScope.COMPANY:
        # All active employees with active users
        active_employees = list(
            db.scalars(
                select(Employee)
                .join(User, Employee.user_id == User.id)
                .where(
                    User.is_active == True,
                    Employee.employment_status == EmploymentStatus.ACTIVE,
                    Employee.deleted_at.is_(None),
                )
            ).all()
        )
    elif announcement.announcement_scope == AnnouncementScope.PROJECT and announcement.project_id:
        # Only active members assigned to this project
        active_employees = list(
            db.scalars(
                select(Employee)
                .join(User, Employee.user_id == User.id)
                .join(ProjectAssignment, Employee.id == ProjectAssignment.employee_id)
                .where(
                    ProjectAssignment.project_id == announcement.project_id,
                    ProjectAssignment.status == AssignmentStatus.ACTIVE,
                    User.is_active == True,
                    Employee.employment_status == EmploymentStatus.ACTIVE,
                    Employee.deleted_at.is_(None),
                )
            ).all()
        )

    if not active_employees:
        logger.info(f"No eligible recipients found for announcement ID {announcement.id}")
        return

    # Extract user IDs for in-app notification
    recipient_user_ids = sorted(list(set(emp.user_id for emp in active_employees if emp.user_id)))

    if recipient_user_ids:
        notify_users(
            db=db,
            user_ids=recipient_user_ids,
            title=notif_title,
            message=notif_msg,
            notification_type=notification_type,
            reference_id=str(announcement.id),
            reference_type="ANNOUNCEMENT",
        )

    # 3. Send HTML Announcement Email to deduplicated active employees
    proj_name = project.name if project else ""
    pub_date = (
        announcement.published_at.strftime("%B %d, %Y")
        if announcement.published_at
        else datetime.now(timezone.utc).strftime("%B %d, %Y")
    )
    scope_str = (
        announcement.announcement_scope.value
        if hasattr(announcement.announcement_scope, "value")
        else str(announcement.announcement_scope)
    )

    seen_emails = set()

    for emp in active_employees:
        recipient_email = emp.user.email if (emp.user and emp.user.email) else None
        if not recipient_email or recipient_email in seen_emails:
            continue

        seen_emails.add(recipient_email)
        emp_name = f"{emp.first_name} {emp.last_name}".strip()

        try:
            send_announcement_email(
                recipient_email=recipient_email,
                employee_name=emp_name,
                announcement_title=announcement.title,
                announcement_content=announcement.content,
                announcement_scope=scope_str,
                project_name=proj_name,
                published_date=pub_date,
                login_url=settings.FRONTEND_URL,
            )
            logger.info(f"Announcement email sent to recipient: {recipient_email}")
        except Exception as e:
            logger.error(
                f"Failed to send announcement email to {recipient_email}: {e}"
            )




def get_announcements_for_hr(
    db: Session,
    current_user: User,
    page: int = 1,
    limit: int = 20,
    scope: Optional[AnnouncementScope] = None,
    status_filter: Optional[AnnouncementStatus] = None,
    announcement_type: Optional[AnnouncementType] = None,
    project_id: Optional[int] = None,
    search: Optional[str] = None,
) -> AnnouncementListPaginated:
    """
    Retrieve announcements for HR with pagination and filters. HR Only.
    """
    if current_user.role != UserRole.HR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HR can access HR announcement management.",
        )

    page = max(1, page)
    limit = max(1, min(100, limit))

    query = select(Announcement)
    filters = []

    if scope:
        filters.append(Announcement.announcement_scope == scope)
    if status_filter:
        filters.append(Announcement.status == status_filter)
    if announcement_type:
        filters.append(Announcement.announcement_type == announcement_type)
    if project_id:
        filters.append(Announcement.project_id == project_id)
    if search and search.strip():
        term = f"%{search.strip()}%"
        filters.append(
            or_(
                Announcement.title.ilike(term),
                Announcement.content.ilike(term),
            )
        )

    if filters:
        query = query.where(and_(*filters))

    # Total count
    count_stmt = select(func.count(Announcement.id))
    if filters:
        count_stmt = count_stmt.where(and_(*filters))
    total = db.scalar(count_stmt) or 0
    total_pages = math.ceil(total / limit) if total > 0 else 0

    offset = (page - 1) * limit
    query = (
        query.order_by(desc(Announcement.created_at), desc(Announcement.id))
        .offset(offset)
        .limit(limit)
    )

    announcements = list(db.scalars(query).all())

    items = [
        _format_announcement_response(db, a, is_hr=True)
        for a in announcements
    ]

    return AnnouncementListPaginated(
        items=items,
        page=page,
        limit=limit,
        total=total,
        total_pages=total_pages,
        unread_count=0,
    )


def get_announcements_for_employee(
    db: Session,
    current_user: User,
    page: int = 1,
    limit: int = 20,
    scope: Optional[AnnouncementScope] = None,
    announcement_type: Optional[AnnouncementType] = None,
    unread_only: bool = False,
    search: Optional[str] = None,
) -> AnnouncementListPaginated:
    """
    Retrieve authorized announcements feed for Employee.
    IDOR & Access Control strictly enforced at database query level.
    """
    employee = db.scalar(
        select(Employee).where(
            Employee.user_id == current_user.id,
            Employee.deleted_at.is_(None),
            Employee.employment_status == EmploymentStatus.ACTIVE,
        )
    )

    if not employee:
        # If user is HR accessing employee feed, get employee object if exists
        employee = db.scalar(
            select(Employee).where(
                Employee.user_id == current_user.id,
                Employee.deleted_at.is_(None),
            )
        )

    employee_id = employee.id if employee else None

    # Active project IDs for employee
    active_project_ids: List[int] = []
    if employee_id:
        active_project_ids = list(
            db.scalars(
                select(ProjectAssignment.project_id).where(
                    ProjectAssignment.employee_id == employee_id,
                    ProjectAssignment.status == AssignmentStatus.ACTIVE,
                )
            ).all()
        )

    now = datetime.now(timezone.utc)

    # Base access conditions:
    # 1. Status == PUBLISHED
    # 2. Archived_at IS NULL
    # 3. Not expired (expires_at IS NULL OR expires_at > now)
    # 4. Scope == COMPANY OR (Scope == PROJECT AND project_id IN active_project_ids)
    access_conditions = [
        Announcement.status == AnnouncementStatus.PUBLISHED,
        Announcement.archived_at.is_(None),
        or_(
            Announcement.expires_at.is_(None),
            Announcement.expires_at > now,
        ),
        or_(
            Announcement.announcement_scope == AnnouncementScope.COMPANY,
            and_(
                Announcement.announcement_scope == AnnouncementScope.PROJECT,
                Announcement.project_id.in_(active_project_ids) if active_project_ids else False,
            ),
        ),
    ]

    if scope:
        access_conditions.append(Announcement.announcement_scope == scope)
    if announcement_type:
        access_conditions.append(Announcement.announcement_type == announcement_type)
    if search and search.strip():
        term = f"%{search.strip()}%"
        access_conditions.append(
            or_(
                Announcement.title.ilike(term),
                Announcement.content.ilike(term),
            )
        )

    if unread_only and employee_id:
        # Subquery for read announcement IDs
        read_ids = select(AnnouncementRead.announcement_id).where(
            AnnouncementRead.employee_id == employee_id
        )
        access_conditions.append(Announcement.id.not_in(read_ids))

    query = select(Announcement).where(and_(*access_conditions))

    # Total count
    count_stmt = select(func.count(Announcement.id)).where(and_(*access_conditions))
    total = db.scalar(count_stmt) or 0
    total_pages = math.ceil(total / limit) if total > 0 else 0

    # Calculate overall unread count for feed
    unread_count = 0
    if employee_id:
        unread_stmt = (
            select(func.count(Announcement.id))
            .where(
                and_(
                    *access_conditions,
                    Announcement.id.not_in(
                        select(AnnouncementRead.announcement_id).where(
                            AnnouncementRead.employee_id == employee_id
                        )
                    ),
                )
            )
        )
        unread_count = db.scalar(unread_stmt) or 0

    page = max(1, page)
    limit = max(1, min(100, limit))
    offset = (page - 1) * limit

    query = (
        query.order_by(desc(Announcement.published_at), desc(Announcement.created_at))
        .offset(offset)
        .limit(limit)
    )

    announcements = list(db.scalars(query).all())

    items = [
        _format_announcement_response(db, a, employee_id=employee_id, is_hr=False)
        for a in announcements
    ]

    return AnnouncementListPaginated(
        items=items,
        page=page,
        limit=limit,
        total=total,
        total_pages=total_pages,
        unread_count=unread_count,
    )


def get_announcement_by_id(
    db: Session,
    announcement_id: int,
    current_user: User,
) -> AnnouncementResponse:
    """
    Retrieve single announcement details with backend IDOR authorization.
    """
    announcement = db.scalar(
        select(Announcement).where(Announcement.id == announcement_id)
    )
    if not announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Announcement not found.",
        )

    # HR User has complete management access
    if current_user.role == UserRole.HR:
        return _format_announcement_response(db, announcement, is_hr=True)

    # Employee authorization check
    employee = db.scalar(
        select(Employee).where(
            Employee.user_id == current_user.id,
            Employee.deleted_at.is_(None),
            Employee.employment_status == EmploymentStatus.ACTIVE,
        )
    )
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Active employee record required.",
        )

    # Check status (must be PUBLISHED)
    if announcement.status != AnnouncementStatus.PUBLISHED or announcement.archived_at is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This announcement is not currently available.",
        )

    # Check expiry
    if announcement.expires_at and announcement.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This announcement has expired.",
        )

    # Check project scope assignment
    if announcement.announcement_scope == AnnouncementScope.PROJECT:
        assignment = db.scalar(
            select(ProjectAssignment).where(
                ProjectAssignment.project_id == announcement.project_id,
                ProjectAssignment.employee_id == employee.id,
                ProjectAssignment.status == AssignmentStatus.ACTIVE,
            )
        )
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to view announcements for this project.",
            )

    return _format_announcement_response(db, announcement, employee_id=employee.id, is_hr=False)


def mark_announcement_as_read(
    db: Session,
    announcement_id: int,
    current_user: User,
) -> AnnouncementReadResponse:
    """
    Mark an announcement as read. On demand.
    Repeated calls return existing read record without duplicate rows or audit logs.
    IDOR Protected.
    """
    employee = db.scalar(
        select(Employee).where(
            Employee.user_id == current_user.id,
            Employee.deleted_at.is_(None),
        )
    )
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only employees can mark announcements as read.",
        )

    announcement = db.scalar(
        select(Announcement).where(Announcement.id == announcement_id)
    )
    if not announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Announcement not found.",
        )

    # Authorization check
    if current_user.role != UserRole.HR:
        if announcement.status != AnnouncementStatus.PUBLISHED or announcement.archived_at is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot read an unpublished or archived announcement.",
            )

        if announcement.announcement_scope == AnnouncementScope.PROJECT:
            assignment = db.scalar(
                select(ProjectAssignment).where(
                    ProjectAssignment.project_id == announcement.project_id,
                    ProjectAssignment.employee_id == employee.id,
                    ProjectAssignment.status == AssignmentStatus.ACTIVE,
                )
            )
            if not assignment:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not authorized to access this project announcement.",
                )

    # Check for existing read record
    existing_read = db.scalar(
        select(AnnouncementRead).where(
            AnnouncementRead.announcement_id == announcement.id,
            AnnouncementRead.employee_id == employee.id,
        )
    )

    if existing_read:
        # Idempotent: return existing record without duplicate DB write or duplicate audit log
        return AnnouncementReadResponse(
            id=existing_read.id,
            announcement_id=existing_read.announcement_id,
            employee_id=existing_read.employee_id,
            read_at=existing_read.read_at,
            message="Announcement already marked as read.",
        )

    # Create new read record
    now = datetime.now(timezone.utc)
    new_read = AnnouncementRead(
        announcement_id=announcement.id,
        employee_id=employee.id,
        read_at=now,
        created_at=now,
    )
    db.add(new_read)
    db.flush()

    # Log audit event
    create_audit_log(
        db=db,
        user_id=current_user.id,
        action=AuditAction.ANNOUNCEMENT_READ,
    )

    db.commit()
    db.refresh(new_read)

    return AnnouncementReadResponse(
        id=new_read.id,
        announcement_id=new_read.announcement_id,
        employee_id=new_read.employee_id,
        read_at=new_read.read_at,
        message="Announcement marked as read.",
    )
