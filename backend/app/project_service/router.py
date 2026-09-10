from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.authentication_service.dependencies import (
    get_current_hr,
    get_current_user,
)
from app.authentication_service.models import User
from app.core.database import get_db
from app.employee_service.service import get_employee_by_user_id
from app.project_service.models import ProjectPriority, ProjectStatus
from app.project_service.schemas import (
    EmployeeProjectResponse,
    HRProjectDashboardMetrics,
    ProjectAssignmentCreate,
    ProjectAssignmentResponse,
    ProjectCreate,
    ProjectListResponse,
    ProjectProgressUpdate,
    ProjectResponse,
    ProjectRoleCreate,
    ProjectRoleResponse,
    ProjectRoleUpdate,
    ProjectStatusUpdate,
    ProjectTeamMemberResponse,
    ProjectUpdate,
)
from app.project_service.service import (
    assign_employee_to_project,
    calculate_is_overdue,
    create_project,
    create_project_role,
    get_employee_my_projects,
    get_employee_project_details,
    get_hr_dashboard_metrics,
    get_project_by_id,
    get_project_roles,
    get_project_team,
    get_projects,
    remove_employee_from_project,
    update_project,
    update_project_progress,
    update_project_role,
    update_project_status,
)

router = APIRouter(
    prefix="/projects",
    tags=["Project Management"],
)

roles_router = APIRouter(
    prefix="/project-roles",
    tags=["Project Roles"],
)


# =========================================================
# PROJECT ROLES ENDPOINTS
# =========================================================

@roles_router.get(
    "",
    response_model=List[ProjectRoleResponse],
)
def list_project_roles(
    active_only: bool = Query(
        True,
        description="Filter active roles only",
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all project roles (Accessible to all authenticated users for selection)."""
    return get_project_roles(
        db,
        active_only=active_only,
    )


@roles_router.post(
    "",
    response_model=ProjectRoleResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_new_project_role(
    schema: ProjectRoleCreate,
    request: Request,
    current_user: User = Depends(get_current_hr),
    db: Session = Depends(get_db),
):
    """Create a new project role (HR Only)."""
    return create_project_role(
        db,
        schema,
        current_user.id,
        request.client.host if request.client else None,
    )


@roles_router.put(
    "/{role_id}",
    response_model=ProjectRoleResponse,
)
def edit_project_role(
    role_id: int,
    schema: ProjectRoleUpdate,
    request: Request,
    current_user: User = Depends(get_current_hr),
    db: Session = Depends(get_db),
):
    """Update a project role name, description, or active status (HR Only)."""
    return update_project_role(
        db,
        role_id,
        schema,
        current_user.id,
        request.client.host if request.client else None,
    )


# =========================================================
# HR DASHBOARD METRICS
# =========================================================

@router.get(
    "/metrics",
    response_model=HRProjectDashboardMetrics,
)
def get_project_dashboard_metrics(
    current_user: User = Depends(get_current_hr),
    db: Session = Depends(get_db),
):
    """Retrieve HR project overview metrics (HR Only)."""
    return get_hr_dashboard_metrics(db)


# =========================================================
# EMPLOYEE SELF-SERVICE
# =========================================================

@router.get(
    "/my-projects",
    response_model=List[EmployeeProjectResponse],
)
def get_my_assigned_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve projects assigned to the current employee."""
    emp = get_employee_by_user_id(
        db,
        current_user.id,
    )

    if not emp:
        return []

    return get_employee_my_projects(
        db,
        emp.id,
    )


@router.get(
    "/my-projects/{id}",
)
def get_my_assigned_project_details(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve details for a specific project assigned to current employee (IDOR Protected)."""
    emp = get_employee_by_user_id(
        db,
        current_user.id,
    )

    if not emp:
        return []

    return get_employee_project_details(
        db,
        emp.id,
        id,
    )


# =========================================================
# HR PROJECT MANAGEMENT ENDPOINTS
# =========================================================

@router.post(
    "",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_new_project(
    schema: ProjectCreate,
    request: Request,
    current_user: User = Depends(get_current_hr),
    db: Session = Depends(get_db),
):
    """Create a new project (HR Only)."""
    proj = create_project(
        db,
        schema,
        current_user.id,
        request.client.host if request.client else None,
    )

    res = ProjectResponse.model_validate(proj)
    res.is_overdue = calculate_is_overdue(
        proj.end_date,
        proj.status,
    )

    return res


@router.get(
    "",
    response_model=ProjectListResponse,
)
def list_projects(
    search: Optional[str] = Query(
        None,
        description="Search by project name, code, or description",
    ),
    status: Optional[ProjectStatus] = Query(
        None,
        description="Filter by status",
    ),
    priority: Optional[ProjectPriority] = Query(
        None,
        description="Filter by priority",
    ),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_hr),
    db: Session = Depends(get_db),
):
    """List projects with pagination, search, and status/priority filters (HR Only)."""
    projects, total, total_pages = get_projects(
        db,
        search=search,
        status_filter=status,
        priority_filter=priority,
        page=page,
        limit=limit,
    )

    items = []

    for p in projects:
        item = ProjectResponse.model_validate(p)
        item.is_overdue = calculate_is_overdue(
            p.end_date,
            p.status,
        )
        items.append(item)

    return ProjectListResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


@router.get(
    "/{id}",
    response_model=ProjectResponse,
)
def get_project_details(
    id: int,
    current_user: User = Depends(get_current_hr),
    db: Session = Depends(get_db),
):
    """Retrieve details for a single project (HR Only)."""
    proj = get_project_by_id(
        db,
        id,
    )

    res = ProjectResponse.model_validate(proj)
    res.is_overdue = calculate_is_overdue(
        proj.end_date,
        proj.status,
    )

    return res


@router.put(
    "/{id}",
    response_model=ProjectResponse,
)
def edit_project_metadata(
    id: int,
    schema: ProjectUpdate,
    request: Request,
    current_user: User = Depends(get_current_hr),
    db: Session = Depends(get_db),
):
    """Update project metadata, dates, or progress (HR Only)."""
    proj = update_project(
        db,
        id,
        schema,
        current_user.id,
        request.client.host if request.client else None,
    )

    res = ProjectResponse.model_validate(proj)
    res.is_overdue = calculate_is_overdue(
        proj.end_date,
        proj.status,
    )

    return res


@router.patch(
    "/{id}/status",
    response_model=ProjectResponse,
)
def change_project_status(
    id: int,
    schema: ProjectStatusUpdate,
    request: Request,
    current_user: User = Depends(get_current_hr),
    db: Session = Depends(get_db),
):
    """Change project status enforcing state transition rules (HR Only)."""
    proj = update_project_status(
        db,
        id,
        schema,
        current_user.id,
        request.client.host if request.client else None,
    )

    res = ProjectResponse.model_validate(proj)
    res.is_overdue = calculate_is_overdue(
        proj.end_date,
        proj.status,
    )

    return res


@router.patch(
    "/{id}/progress",
    response_model=ProjectResponse,
)
def change_project_progress(
    id: int,
    schema: ProjectProgressUpdate,
    request: Request,
    current_user: User = Depends(get_current_hr),
    db: Session = Depends(get_db),
):
    """Update project progress percentage (0-100%) (HR Only)."""
    proj = update_project_progress(
        db,
        id,
        schema,
        current_user.id,
        request.client.host if request.client else None,
    )

    res = ProjectResponse.model_validate(proj)
    res.is_overdue = calculate_is_overdue(
        proj.end_date,
        proj.status,
    )

    return res


# =========================================================
# TEAM ASSIGNMENTS ENDPOINTS
# =========================================================

@router.post(
    "/{id}/assignments",
    response_model=ProjectAssignmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def assign_employee(
    id: int,
    schema: ProjectAssignmentCreate,
    request: Request,
    current_user: User = Depends(get_current_hr),
    db: Session = Depends(get_db),
):
    """Assign an active employee to a project with a project role (HR Only)."""
    return assign_employee_to_project(
        db,
        id,
        schema,
        current_user.id,
        request.client.host if request.client else None,
    )


@router.get(
    "/{id}/assignments",
    response_model=List[ProjectTeamMemberResponse],
)
def get_team_members(
    id: int,
    current_user: User = Depends(get_current_hr),
    db: Session = Depends(get_db),
):
    """Retrieve full project team roster with designations & roles (HR Only)."""
    return get_project_team(
        db,
        id,
    )


@router.patch(
    "/{id}/assignments/{assignment_id}/remove",
    response_model=ProjectAssignmentResponse,
)
def remove_employee(
    id: int,
    assignment_id: int,
    request: Request,
    current_user: User = Depends(get_current_hr),
    db: Session = Depends(get_db),
):
    """Soft-remove an employee from a project, setting removed_date and status=REMOVED (HR Only)."""
    return remove_employee_from_project(
        db,
        id,
        assignment_id,
        current_user.id,
        request.client.host if request.client else None,
    )