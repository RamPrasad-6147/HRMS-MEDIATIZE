from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.authentication_service.dependencies import (
    get_current_hr,
    get_current_user,
)
from app.authentication_service.models import User
from app.core.database import get_db
from app.performance_service import service
from app.performance_service.models import GoalStatus, ReviewStatus
from app.performance_service.schemas import (
    EmployeePerformanceSummary,
    HRPerformanceAnalyticsResponse,
    HRPerformanceDashboardResponse,
    PerformanceGoalCreate,
    PerformanceGoalListResponse,
    PerformanceGoalResponse,
    PerformanceGoalStatusUpdate,
    PerformanceGoalUpdate,
    PerformanceReviewCreate,
    PerformanceReviewListResponse,
    PerformanceReviewResponse,
    PerformanceReviewUpdate,
)

router = APIRouter(
    prefix="/performance",
    tags=["Performance & Analytics"],
)


# ============================================================
# Employee Endpoints (/performance/my/*)
# ============================================================

@router.get(
    "/my/summary",
    response_model=EmployeePerformanceSummary,
)
def get_my_performance_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get performance summary, metrics, and contextual HR data for the logged-in employee."""
    emp = service.get_employee_by_user_id(
        db,
        current_user.id,
    )

    return service.get_employee_performance_summary(
        db,
        emp.id,
        current_user,
    )


@router.get(
    "/my/reviews",
    response_model=PerformanceReviewListResponse,
)
def list_my_performance_reviews(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List completed performance reviews for the logged-in employee."""
    items, total = service.list_performance_reviews(
        db=db,
        current_user=current_user,
        page=page,
        limit=limit,
    )

    total_pages = (
        (total + limit - 1) // limit
        if limit > 0
        else 0
    )

    return PerformanceReviewListResponse(
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
        items=items,
    )


@router.get(
    "/my/reviews/{id}",
    response_model=PerformanceReviewResponse,
)
def get_my_performance_review(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get details of a completed performance review for the logged-in employee."""
    return service.get_performance_review_by_id(
        db,
        id,
        current_user,
    )


@router.get(
    "/my/goals",
    response_model=PerformanceGoalListResponse,
)
def list_my_goals(
    status_filter: Optional[GoalStatus] = Query(
        None,
        alias="status",
    ),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List assigned performance goals for the logged-in employee."""
    items, total = service.list_performance_goals(
        db=db,
        current_user=current_user,
        status_filter=status_filter,
        page=page,
        limit=limit,
    )

    total_pages = (
        (total + limit - 1) // limit
        if limit > 0
        else 0
    )

    item_responses = [
        PerformanceGoalResponse(
            id=g.id,
            employee_id=g.employee_id,
            employee_name=(
                f"{g.employee.first_name} {g.employee.last_name}"
                if g.employee
                else None
            ),
            employee_code=(
                g.employee.employee_code
                if g.employee
                else None
            ),
            title=g.title,
            description=g.description,
            target_date=g.target_date,
            status=g.status,
            progress_percentage=g.progress_percentage,
            created_by=g.created_by,
            completed_at=g.completed_at,
            created_at=g.created_at,
            updated_at=g.updated_at,
        )
        for g in items
    ]

    return PerformanceGoalListResponse(
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
        items=item_responses,
    )


@router.patch(
    "/my/goals/{id}/status",
    response_model=PerformanceGoalResponse,
)
def update_my_goal_status(
    id: int,
    payload: PerformanceGoalStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update goal status or progress percentage for an assigned goal."""
    g = service.update_performance_goal_status(
        db,
        id,
        payload,
        current_user,
    )

    return PerformanceGoalResponse(
        id=g.id,
        employee_id=g.employee_id,
        employee_name=(
            f"{g.employee.first_name} {g.employee.last_name}"
            if g.employee
            else None
        ),
        employee_code=(
            g.employee.employee_code
            if g.employee
            else None
        ),
        title=g.title,
        description=g.description,
        target_date=g.target_date,
        status=g.status,
        progress_percentage=g.progress_percentage,
        created_by=g.created_by,
        completed_at=g.completed_at,
        created_at=g.created_at,
        updated_at=g.updated_at,
    )


# ============================================================
# HR Endpoints (/performance/*)
# ============================================================

@router.get(
    "/dashboard",
    response_model=HRPerformanceDashboardResponse,
)
def get_hr_dashboard(
    current_hr: User = Depends(get_current_hr),
    db: Session = Depends(get_db),
):
    """Get system-wide HR performance dashboard KPIs."""
    return service.get_hr_performance_dashboard(db)


@router.get(
    "/analytics",
    response_model=HRPerformanceAnalyticsResponse,
)
def get_hr_analytics(
    current_hr: User = Depends(get_current_hr),
    db: Session = Depends(get_db),
):
    """Get aggregated metrics for interactive performance charts (HR access)."""
    return service.get_hr_performance_analytics(db)


@router.get(
    "/employees/{employee_id}",
    response_model=EmployeePerformanceSummary,
)
def get_employee_performance_details(
    employee_id: int,
    current_hr: User = Depends(get_current_hr),
    db: Session = Depends(get_db),
):
    """Get detailed performance overview and contextual metrics for an employee (HR access)."""
    return service.get_employee_performance_summary(
        db,
        employee_id,
        current_hr,
    )


@router.get(
    "/reviews",
    response_model=PerformanceReviewListResponse,
)
def list_reviews(
    employee_id: Optional[int] = Query(None),
    status_filter: Optional[ReviewStatus] = Query(
        None,
        alias="status",
    ),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    current_hr: User = Depends(get_current_hr),
    db: Session = Depends(get_db),
):
    """List all performance reviews with optional filters (HR access)."""
    items, total = service.list_performance_reviews(
        db=db,
        current_user=current_hr,
        employee_id=employee_id,
        status_filter=status_filter,
        page=page,
        limit=limit,
    )

    total_pages = (
        (total + limit - 1) // limit
        if limit > 0
        else 0
    )

    return PerformanceReviewListResponse(
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
        items=items,
    )


@router.post(
    "/reviews",
    response_model=PerformanceReviewResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_review(
    payload: PerformanceReviewCreate,
    current_hr: User = Depends(get_current_hr),
    db: Session = Depends(get_db),
):
    """Create a draft performance review (HR access)."""
    return service.create_performance_review(
        db,
        payload,
        current_hr.id,
    )


@router.get(
    "/reviews/{id}",
    response_model=PerformanceReviewResponse,
)
def get_review(
    id: int,
    current_hr: User = Depends(get_current_hr),
    db: Session = Depends(get_db),
):
    """Get details of a performance review by ID (HR access)."""
    return service.get_performance_review_by_id(
        db,
        id,
        current_hr,
    )


@router.put(
    "/reviews/{id}",
    response_model=PerformanceReviewResponse,
)
def update_review(
    id: int,
    payload: PerformanceReviewUpdate,
    current_hr: User = Depends(get_current_hr),
    db: Session = Depends(get_db),
):
    """Update a draft performance review (HR access)."""
    return service.update_performance_review(
        db,
        id,
        payload,
        current_hr.id,
    )


@router.patch(
    "/reviews/{id}/complete",
    response_model=PerformanceReviewResponse,
)
def complete_review(
    id: int,
    current_hr: User = Depends(get_current_hr),
    db: Session = Depends(get_db),
):
    """Complete a performance review and calculate authoritative rating (HR access)."""
    return service.complete_performance_review(
        db,
        id,
        current_hr.id,
    )


@router.get(
    "/goals",
    response_model=PerformanceGoalListResponse,
)
def list_goals(
    employee_id: Optional[int] = Query(None),
    status_filter: Optional[GoalStatus] = Query(
        None,
        alias="status",
    ),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    current_hr: User = Depends(get_current_hr),
    db: Session = Depends(get_db),
):
    """List performance goals across employees with filters (HR access)."""
    items, total = service.list_performance_goals(
        db=db,
        current_user=current_hr,
        employee_id=employee_id,
        status_filter=status_filter,
        page=page,
        limit=limit,
    )

    total_pages = (
        (total + limit - 1) // limit
        if limit > 0
        else 0
    )

    item_responses = [
        PerformanceGoalResponse(
            id=g.id,
            employee_id=g.employee_id,
            employee_name=(
                f"{g.employee.first_name} {g.employee.last_name}"
                if g.employee
                else None
            ),
            employee_code=(
                g.employee.employee_code
                if g.employee
                else None
            ),
            title=g.title,
            description=g.description,
            target_date=g.target_date,
            status=g.status,
            progress_percentage=g.progress_percentage,
            created_by=g.created_by,
            completed_at=g.completed_at,
            created_at=g.created_at,
            updated_at=g.updated_at,
        )
        for g in items
    ]

    return PerformanceGoalListResponse(
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
        items=item_responses,
    )


@router.post(
    "/goals",
    response_model=PerformanceGoalResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_goal(
    payload: PerformanceGoalCreate,
    current_hr: User = Depends(get_current_hr),
    db: Session = Depends(get_db),
):
    """Create a new performance goal for an employee (HR access)."""
    g = service.create_performance_goal(
        db,
        payload,
        current_hr.id,
    )

    return PerformanceGoalResponse(
        id=g.id,
        employee_id=g.employee_id,
        employee_name=(
            f"{g.employee.first_name} {g.employee.last_name}"
            if g.employee
            else None
        ),
        employee_code=(
            g.employee.employee_code
            if g.employee
            else None
        ),
        title=g.title,
        description=g.description,
        target_date=g.target_date,
        status=g.status,
        progress_percentage=g.progress_percentage,
        created_by=g.created_by,
        completed_at=g.completed_at,
        created_at=g.created_at,
        updated_at=g.updated_at,
    )


@router.put(
    "/goals/{id}",
    response_model=PerformanceGoalResponse,
)
def update_goal(
    id: int,
    payload: PerformanceGoalUpdate,
    current_hr: User = Depends(get_current_hr),
    db: Session = Depends(get_db),
):
    """Update a performance goal (HR access)."""
    g = service.update_performance_goal(
        db,
        id,
        payload,
        current_hr.id,
    )

    return PerformanceGoalResponse(
        id=g.id,
        employee_id=g.employee_id,
        employee_name=(
            f"{g.employee.first_name} {g.employee.last_name}"
            if g.employee
            else None
        ),
        employee_code=(
            g.employee.employee_code
            if g.employee
            else None
        ),
        title=g.title,
        description=g.description,
        target_date=g.target_date,
        status=g.status,
        progress_percentage=g.progress_percentage,
        created_by=g.created_by,
        completed_at=g.completed_at,
        created_at=g.created_at,
        updated_at=g.updated_at,
    )


@router.patch(
    "/goals/{id}/status",
    response_model=PerformanceGoalResponse,
)
def update_goal_status(
    id: int,
    payload: PerformanceGoalStatusUpdate,
    current_hr: User = Depends(get_current_hr),
    db: Session = Depends(get_db),
):
    """Update status or progress percentage of a goal (HR access)."""
    g = service.update_performance_goal_status(
        db,
        id,
        payload,
        current_hr,
    )

    return PerformanceGoalResponse(
        id=g.id,
        employee_id=g.employee_id,
        employee_name=(
            f"{g.employee.first_name} {g.employee.last_name}"
            if g.employee
            else None
        ),
        employee_code=(
            g.employee.employee_code
            if g.employee
            else None
        ),
        title=g.title,
        description=g.description,
        target_date=g.target_date,
        status=g.status,
        progress_percentage=g.progress_percentage,
        created_by=g.created_by,
        completed_at=g.completed_at,
        created_at=g.created_at,
        updated_at=g.updated_at,
    )