from datetime import date, datetime, timezone
import logging
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import and_, func, or_, select, update
from sqlalchemy.orm import Session, joinedload

from app.audit_service.models import AuditAction, AuditLog
from app.authentication_service.models import User
from app.core.config import settings
from app.email_service.service import send_project_assignment_email
from app.employee_service.models import Employee, EmploymentStatus
from app.notification_service.enums import NotificationType
from app.notification_service.models import Notification
from app.project_service.models import (
    AssignmentStatus,
    Project,
    ProjectAssignment,
    ProjectPriority,
    ProjectRole,
    ProjectStatus,
)
from app.project_service.schemas import (
    HRProjectDashboardMetrics,
    ProjectAssignmentCreate,
    ProjectCreate,
    ProjectProgressUpdate,
    ProjectRoleCreate,
    ProjectRoleUpdate,
    ProjectStatusUpdate,
    ProjectUpdate,
)

logger = logging.getLogger(__name__)



def calculate_is_overdue(end_date: Optional[date], project_status: ProjectStatus) -> bool:
    if not end_date:
        return False
    return date.today() > end_date and project_status not in (
        ProjectStatus.COMPLETED,
        ProjectStatus.CANCELLED,
    )


# =========================================================
# PROJECT ROLES SERVICE
# =========================================================
def create_project_role(db: Session, schema: ProjectRoleCreate, user_id: int, ip_address: Optional[str] = None) -> ProjectRole:
    existing = db.scalar(select(ProjectRole).where(func.lower(ProjectRole.name) == schema.name.strip().lower()))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Project role '{schema.name}' already exists.",
        )
    role = ProjectRole(
        name=schema.name.strip(),
        description=schema.description.strip() if schema.description else None,
        is_active=True,
    )
    db.add(role)
    db.flush()

    audit = AuditLog(
        user_id=user_id,
        action=AuditAction.PROJECT_ROLE_CREATED,
        ip_address=ip_address,
    )
    db.add(audit)
    db.commit()
    db.refresh(role)
    return role


def get_project_roles(db: Session, active_only: bool = False) -> List[ProjectRole]:
    stmt = select(ProjectRole)
    if active_only:
        stmt = stmt.where(ProjectRole.is_active.is_(True))
    stmt = stmt.order_by(ProjectRole.name.asc())
    return list(db.scalars(stmt).all())


def update_project_role(db: Session, role_id: int, schema: ProjectRoleUpdate, user_id: int, ip_address: Optional[str] = None) -> ProjectRole:
    role = db.get(ProjectRole, role_id)
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project role not found.")

    if schema.name and schema.name.strip().lower() != role.name.lower():
        existing = db.scalar(select(ProjectRole).where(func.lower(ProjectRole.name) == schema.name.strip().lower()))
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Another project role with this name exists.")
        role.name = schema.name.strip()

    if schema.description is not None:
        role.description = schema.description.strip() if schema.description else None

    if schema.is_active is not None:
        role.is_active = schema.is_active

    audit = AuditLog(
        user_id=user_id,
        action=AuditAction.PROJECT_ROLE_UPDATED,
        ip_address=ip_address,
    )
    db.add(audit)
    db.commit()
    db.refresh(role)
    return role


# =========================================================
# PROJECTS SERVICE
# =========================================================
def generate_next_project_code(db: Session) -> str:
    stmt = select(Project.project_code).order_by(Project.id.desc()).limit(1)
    last_code = db.scalar(stmt)
    if not last_code:
        return "PRJ001"
    if last_code.startswith("PRJ") and last_code[3:].isdigit():
        num = int(last_code[3:]) + 1
        return f"PRJ{num:03d}"
    return f"PRJ{db.query(Project).count() + 1:03d}"


def create_project(db: Session, schema: ProjectCreate, creator_id: int, ip_address: Optional[str] = None) -> Project:
    if schema.project_code:
        code = schema.project_code.strip().upper()
        existing = db.scalar(select(Project).where(Project.project_code == code))
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Project code '{code}' already exists.",
            )
    else:
        code = generate_next_project_code(db)

    project = Project(
        project_code=code,
        name=schema.name.strip(),
        description=schema.description.strip() if schema.description else None,
        start_date=schema.start_date,
        end_date=schema.end_date,
        priority=schema.priority,
        status=ProjectStatus.PLANNED,
        progress_percentage=0,
        created_by=creator_id,
    )
    db.add(project)
    db.flush()

    audit = AuditLog(
        user_id=creator_id,
        action=AuditAction.PROJECT_CREATED,
        ip_address=ip_address,
    )
    db.add(audit)
    db.commit()
    db.refresh(project)
    return project


def get_projects(
    db: Session,
    search: Optional[str] = None,
    status_filter: Optional[ProjectStatus] = None,
    priority_filter: Optional[ProjectPriority] = None,
    page: int = 1,
    limit: int = 10,
) -> Tuple[List[Project], int, int]:
    stmt = select(Project).where(Project.deleted_at.is_(None))

    if search and search.strip():
        term = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Project.name.ilike(term),
                Project.project_code.ilike(term),
                Project.description.ilike(term),
            )
        )

    if status_filter:
        stmt = stmt.where(Project.status == status_filter)

    if priority_filter:
        stmt = stmt.where(Project.priority == priority_filter)

    total_count = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0

    offset = (page - 1) * limit
    stmt = stmt.order_by(Project.id.desc()).offset(offset).limit(limit)
    projects = list(db.scalars(stmt).all())

    total_pages = (total_count + limit - 1) // limit if limit > 0 else 1
    return projects, total_count, total_pages


def get_project_by_id(db: Session, project_id: int) -> Project:
    project = db.scalar(
        select(Project).where(Project.id == project_id, Project.deleted_at.is_(None))
    )
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
    return project


def update_project(db: Session, project_id: int, schema: ProjectUpdate, user_id: int, ip_address: Optional[str] = None) -> Project:
    project = get_project_by_id(db, project_id)

    if schema.name is not None:
        project.name = schema.name.strip()
    if schema.description is not None:
        project.description = schema.description.strip() if schema.description else None
    if schema.start_date is not None:
        project.start_date = schema.start_date
    if schema.end_date is not None:
        project.end_date = schema.end_date
    if schema.priority is not None:
        project.priority = schema.priority
    if schema.progress_percentage is not None:
        project.progress_percentage = schema.progress_percentage

    if project.end_date and project.end_date < project.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="end_date cannot be earlier than start_date.",
        )

    audit = AuditLog(
        user_id=user_id,
        action=AuditAction.PROJECT_UPDATED,
        ip_address=ip_address,
    )
    db.add(audit)
    db.commit()
    db.refresh(project)
    return project


def update_project_status(db: Session, project_id: int, schema: ProjectStatusUpdate, user_id: int, ip_address: Optional[str] = None) -> Project:
    project = get_project_by_id(db, project_id)
    old_status = project.status
    new_status = schema.status

    if old_status == new_status:
        return project

    # Status transition rules
    if old_status == ProjectStatus.PLANNED and new_status not in (ProjectStatus.IN_PROGRESS, ProjectStatus.CANCELLED):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot transition project from {old_status} to {new_status}.")
    if old_status in (ProjectStatus.COMPLETED, ProjectStatus.CANCELLED):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot change status of a {old_status} project.")

    if new_status == ProjectStatus.COMPLETED and project.progress_percentage < 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project progress must reach 100% before marking as COMPLETED.",
        )

    project.status = new_status

    audit = AuditLog(
        user_id=user_id,
        action=AuditAction.PROJECT_STATUS_CHANGED,
        ip_address=ip_address,
    )
    db.add(audit)

    # Trigger notifications to assigned team members
    active_assignments = db.scalars(
        select(ProjectAssignment).where(
            ProjectAssignment.project_id == project_id,
            ProjectAssignment.status == AssignmentStatus.ACTIVE,
        )
    ).all()

    for assignment in active_assignments:
        emp = db.get(Employee, assignment.employee_id)
        if emp and emp.user_id:
            notif = Notification(
                user_id=emp.user_id,
                title=f"Project Status Update: {project.name}",
                message=f"The status of project '{project.name}' ({project.project_code}) has changed to {new_status.value}.",
                notification_type=NotificationType.PROJECT_UPDATE,
                reference_id=str(project.id),
                reference_type="PROJECT",
            )
            db.add(notif)

    db.commit()
    db.refresh(project)
    return project


def update_project_progress(db: Session, project_id: int, schema: ProjectProgressUpdate, user_id: int, ip_address: Optional[str] = None) -> Project:
    project = get_project_by_id(db, project_id)
    project.progress_percentage = schema.progress_percentage

    audit = AuditLog(
        user_id=user_id,
        action=AuditAction.PROJECT_PROGRESS_UPDATED,
        ip_address=ip_address,
    )
    db.add(audit)
    db.commit()
    db.refresh(project)
    return project


# =========================================================
# PROJECT ASSIGNMENT SERVICE
# =========================================================
def assign_employee_to_project(db: Session, project_id: int, schema: ProjectAssignmentCreate, user_id: int, ip_address: Optional[str] = None) -> ProjectAssignment:
    project = get_project_by_id(db, project_id)
    if project.status in (ProjectStatus.COMPLETED, ProjectStatus.CANCELLED):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot assign employee to a {project.status} project.")

    employee = db.get(Employee, schema.employee_id)
    if not employee or employee.employment_status != EmploymentStatus.ACTIVE or employee.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Employee not found or is not currently ACTIVE.")

    role = db.get(ProjectRole, schema.project_role_id)
    if not role or not role.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Project role not found or is inactive.")

    # Check active duplicate assignment
    existing_active = db.scalar(
        select(ProjectAssignment).where(
            ProjectAssignment.project_id == project_id,
            ProjectAssignment.employee_id == schema.employee_id,
            ProjectAssignment.status == AssignmentStatus.ACTIVE,
        )
    )
    if existing_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Employee {employee.first_name} {employee.last_name} is already actively assigned to this project.",
        )

    assignment = ProjectAssignment(
        project_id=project_id,
        employee_id=schema.employee_id,
        project_role_id=schema.project_role_id,
        assigned_date=schema.assigned_date or date.today(),
        status=AssignmentStatus.ACTIVE,
    )
    db.add(assignment)
    db.flush()

    audit = AuditLog(
        user_id=user_id,
        action=AuditAction.EMPLOYEE_ASSIGNED_TO_PROJECT,
        ip_address=ip_address,
    )
    db.add(audit)

    # In-app notification for employee
    if employee.user_id:
        notif = Notification(
            user_id=employee.user_id,
            title=f"New Project Assignment: {project.name}",
            message=f"You have been assigned to project '{project.name}' ({project.project_code}) as {role.name}.",
            notification_type=NotificationType.PROJECT_UPDATE,
            reference_id=str(project.id),
            reference_type="PROJECT",
        )
        db.add(notif)

    db.commit()
    db.refresh(assignment)

    # Send HTML email notification to assigned employee
    if employee.user and employee.user.email:
        try:
            assigned_by_user = db.get(User, user_id) if user_id else None
            assigned_by_name = (
                f"{assigned_by_user.employee.first_name} {assigned_by_user.employee.last_name}".strip()
                if (assigned_by_user and assigned_by_user.employee)
                else (assigned_by_user.username if assigned_by_user else "HR Department")
            )
            emp_full_name = f"{employee.first_name} {employee.last_name}".strip()

            send_project_assignment_email(
                recipient_email=employee.user.email,
                employee_name=emp_full_name,
                project_name=project.name,
                project_role=role.name,
                project_description=project.description,
                start_date=str(project.start_date) if project.start_date else None,
                assigned_date=str(assignment.assigned_date) if assignment.assigned_date else None,
                assigned_by_name=assigned_by_name,
                login_url=settings.FRONTEND_URL,
            )
        except Exception as e:
            logger.error(
                f"Failed to send project assignment email to {employee.user.email}: {e}"
            )

    return assignment



def remove_employee_from_project(db: Session, project_id: int, assignment_id: int, user_id: int, ip_address: Optional[str] = None) -> ProjectAssignment:
    assignment = db.get(ProjectAssignment, assignment_id)
    if not assignment or assignment.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project assignment record not found.")

    if assignment.status == AssignmentStatus.REMOVED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Employee assignment is already removed.")

    assignment.status = AssignmentStatus.REMOVED
    assignment.removed_date = date.today()

    audit = AuditLog(
        user_id=user_id,
        action=AuditAction.EMPLOYEE_REMOVED_FROM_PROJECT,
        ip_address=ip_address,
    )
    db.add(audit)

    employee = db.get(Employee, assignment.employee_id)
    project = db.get(Project, project_id)
    if employee and employee.user_id and project:
        notif = Notification(
            user_id=employee.user_id,
            title=f"Project Removal: {project.name}",
            message=f"You have been removed from project '{project.name}' ({project.project_code}).",
            notification_type=NotificationType.PROJECT_UPDATE,
            reference_id=str(project.id),
            reference_type="PROJECT",
        )
        db.add(notif)

    db.commit()
    db.refresh(assignment)
    return assignment


def get_project_team(db: Session, project_id: int) -> List[dict]:
    get_project_by_id(db, project_id)
    stmt = (
        select(ProjectAssignment)
        .options(
            joinedload(ProjectAssignment.employee),
            joinedload(ProjectAssignment.project_role),
        )
        .where(ProjectAssignment.project_id == project_id)
        .order_by(ProjectAssignment.status.asc(), ProjectAssignment.assigned_date.desc())
    )
    assignments = db.scalars(stmt).all()

    result = []
    for a in assignments:
        emp = a.employee
        role = a.project_role
        result.append({
            "assignment_id": a.id,
            "employee_id": emp.id if emp else a.employee_id,
            "employee_code": emp.employee_code if emp else "N/A",
            "employee_name": f"{emp.first_name} {emp.last_name}" if emp else "Unknown",
            "official_designation": getattr(emp, "designation", None) or "N/A",
            "email": emp.user.email if (emp and emp.user) else "N/A",
            "profile_photo_url": emp.profile_photo_url if emp else None,
            "project_role_id": role.id if role else a.project_role_id,
            "project_role_name": role.name if role else "N/A",
            "assigned_date": a.assigned_date,
            "removed_date": a.removed_date,
            "assignment_status": a.status,
        })
    return result


# =========================================================
# EMPLOYEE SELF-SERVICE & IDOR PROTECTION
# =========================================================
def get_employee_my_projects(db: Session, employee_id: int) -> List[dict]:
    stmt = (
        select(ProjectAssignment)
        .options(
            joinedload(ProjectAssignment.project),
            joinedload(ProjectAssignment.project_role),
        )
        .where(
            ProjectAssignment.employee_id == employee_id,
            ProjectAssignment.status == AssignmentStatus.ACTIVE,
        )
        .order_by(ProjectAssignment.assigned_date.desc())
    )
    assignments = db.scalars(stmt).all()

    result = []
    for a in assignments:
        prj = a.project
        if not prj or prj.deleted_at is not None:
            continue

        team_count = db.scalar(
            select(func.count(ProjectAssignment.id)).where(
                ProjectAssignment.project_id == prj.id,
                ProjectAssignment.status == AssignmentStatus.ACTIVE,
            )
        ) or 0

        result.append({
            "project_id": prj.id,
            "project_code": prj.project_code,
            "name": prj.name,
            "description": prj.description,
            "start_date": prj.start_date,
            "end_date": prj.end_date,
            "priority": prj.priority,
            "status": prj.status,
            "progress_percentage": prj.progress_percentage,
            "is_overdue": calculate_is_overdue(prj.end_date, prj.status),
            "project_role_name": a.project_role.name if a.project_role else "Team Member",
            "assigned_date": a.assigned_date,
            "team_members_count": team_count,
        })
    return result


def get_employee_project_details(db: Session, employee_id: int, project_id: int) -> dict:
    # IDOR Check: Must have active assignment
    active_assignment = db.scalar(
        select(ProjectAssignment).where(
            ProjectAssignment.project_id == project_id,
            ProjectAssignment.employee_id == employee_id,
            ProjectAssignment.status == AssignmentStatus.ACTIVE,
        )
    )
    if not active_assignment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You are not an active member of this project.",
        )

    prj = get_project_by_id(db, project_id)
    team = get_project_team(db, project_id)

    return {
        "project": {
            "id": prj.id,
            "project_code": prj.project_code,
            "name": prj.name,
            "description": prj.description,
            "start_date": prj.start_date,
            "end_date": prj.end_date,
            "priority": prj.priority,
            "status": prj.status,
            "progress_percentage": prj.progress_percentage,
            "is_overdue": calculate_is_overdue(prj.end_date, prj.status),
            "created_at": prj.created_at,
            "updated_at": prj.updated_at,
        },
        "my_role": active_assignment.project_role.name if active_assignment.project_role else "Team Member",
        "assigned_date": active_assignment.assigned_date,
        "team": team,
    }


# =========================================================
# HR DASHBOARD METRICS
# =========================================================
def get_hr_dashboard_metrics(db: Session) -> HRProjectDashboardMetrics:
    total = db.scalar(select(func.count(Project.id)).where(Project.deleted_at.is_(None))) or 0
    active = db.scalar(select(func.count(Project.id)).where(Project.deleted_at.is_(None), Project.status == ProjectStatus.IN_PROGRESS)) or 0
    completed = db.scalar(select(func.count(Project.id)).where(Project.deleted_at.is_(None), Project.status == ProjectStatus.COMPLETED)) or 0
    on_hold = db.scalar(select(func.count(Project.id)).where(Project.deleted_at.is_(None), Project.status == ProjectStatus.ON_HOLD)) or 0

    today = date.today()
    overdue = db.scalar(
        select(func.count(Project.id)).where(
            Project.deleted_at.is_(None),
            Project.end_date < today,
            Project.status.notin_([ProjectStatus.COMPLETED, ProjectStatus.CANCELLED]),
        )
    ) or 0

    return HRProjectDashboardMetrics(
        total_projects=total,
        active_projects=active,
        completed_projects=completed,
        on_hold_projects=on_hold,
        overdue_projects=overdue,
    )
