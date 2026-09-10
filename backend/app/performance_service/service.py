from datetime import date, datetime, timezone
import logging
from typing import List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.attendance_service.models import Attendance, AttendanceStatus
from app.audit_service.models import AuditAction
from app.audit_service.service import create_audit_log
from app.authentication_service.models import User, UserRole
from app.core.config import settings
from app.email_service.service import send_performance_feedback_email
from app.employee_service.models import Employee

logger = logging.getLogger(__name__)

from app.leave_service.models import LeaveRequest, LeaveStatus
from app.notification_service.enums import NotificationType
from app.notification_service.service import notify_users
from app.performance_service.models import (
    GoalStatus,
    PerformanceGoal,
    PerformanceReview,
    PerformanceReviewRating,
    ReviewStatus,
)
from app.performance_service.schemas import (
    AttendanceContextSummary,
    CategoryRatingMetric,
    EmployeePerformanceSummary,
    EmployeeRatingMetric,
    GoalProgressMetric,
    HRPerformanceAnalyticsResponse,
    HRPerformanceDashboardResponse,
    LeaveContextSummary,
    PerformanceGoalCreate,
    PerformanceGoalStatusUpdate,
    PerformanceGoalUpdate,
    PerformanceReviewCreate,
    PerformanceReviewResponse,
    PerformanceReviewUpdate,
    PerformanceTrendMetric,
    ProjectMetricSummary,
    RatingResponse,
    ReviewStatusMetric,
    TaskMetricSummary,
    WorkReportMetricSummary,
)
from app.project_service.models import AssignmentStatus, Project, ProjectAssignment, ProjectStatus
from app.work_report_service.models import DailyWorkReport


# ============================================================
# Authorization & Employee Lookup Helpers
# ============================================================

def get_employee_by_user_id(db: Session, user_id: int) -> Employee:
    """Find Employee record by associated User ID."""
    stmt = select(Employee).where(Employee.user_id == user_id, Employee.deleted_at.is_(None))
    employee = db.scalar(stmt)
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee profile not found",
        )
    return employee


def verify_employee_access(db: Session, current_user: User, employee_id: int) -> Employee:
    """
    IDOR Security Guard:
    HR can access any employee's data.
    Employees can ONLY access their own data.
    """
    stmt = select(Employee).where(Employee.id == employee_id, Employee.deleted_at.is_(None))
    employee = db.scalar(stmt)
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
        )

    if current_user.role != UserRole.HR:
        if employee.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to access performance data for another employee",
            )
    return employee


def format_review_response(review: PerformanceReview) -> PerformanceReviewResponse:
    """Helper to convert ORM PerformanceReview to Pydantic Response."""
    emp_name = f"{review.employee.first_name} {review.employee.last_name}" if review.employee else None
    emp_code = review.employee.employee_code if review.employee else None

    rating_responses = [
        RatingResponse(
            id=r.id,
            review_id=r.review_id,
            category=r.category,
            rating=r.rating,
            comments=r.comments,
            created_at=r.created_at,
        )
        for r in review.ratings
    ]

    return PerformanceReviewResponse(
        id=review.id,
        employee_id=review.employee_id,
        employee_name=emp_name,
        employee_code=emp_code,
        review_start_date=review.review_start_date,
        review_end_date=review.review_end_date,
        status=review.status,
        overall_rating=float(review.overall_rating) if review.overall_rating is not None else None,
        overall_feedback=review.overall_feedback,
        created_by=review.created_by,
        completed_at=review.completed_at,
        created_at=review.created_at,
        updated_at=review.updated_at,
        ratings=rating_responses,
    )


# ============================================================
# Performance Review Service
# ============================================================

def create_performance_review(
    db: Session,
    payload: PerformanceReviewCreate,
    creator_id: int,
) -> PerformanceReviewResponse:
    """HR creates a performance review (defaults to DRAFT status)."""
    # Verify employee exists
    stmt = select(Employee).where(Employee.id == payload.employee_id, Employee.deleted_at.is_(None))
    employee = db.scalar(stmt)
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target employee not found",
        )

    review = PerformanceReview(
        employee_id=payload.employee_id,
        review_start_date=payload.review_start_date,
        review_end_date=payload.review_end_date,
        status=ReviewStatus.DRAFT,
        overall_feedback=payload.overall_feedback,
        created_by=creator_id,
    )
    db.add(review)
    db.flush()

    # Create Category Ratings
    for item in payload.ratings:
        rating_obj = PerformanceReviewRating(
            review_id=review.id,
            category=item.category,
            rating=item.rating,
            comments=item.comments,
        )
        db.add(rating_obj)

    db.commit()
    db.refresh(review)

    create_audit_log(
        db=db,
        user_id=creator_id,
        action=AuditAction.PERFORMANCE_REVIEW_CREATED,
    )

    return format_review_response(review)


def update_performance_review(
    db: Session,
    review_id: int,
    payload: PerformanceReviewUpdate,
    creator_id: int,
) -> PerformanceReviewResponse:
    """HR updates a draft performance review."""
    stmt = select(PerformanceReview).where(PerformanceReview.id == review_id)
    review = db.scalar(stmt)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Performance review not found",
        )

    if review.status == ReviewStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Completed performance reviews are finalized and cannot be modified directly",
        )

    if payload.review_start_date is not None:
        review.review_start_date = payload.review_start_date
    if payload.review_end_date is not None:
        review.review_end_date = payload.review_end_date
    if payload.overall_feedback is not None:
        review.overall_feedback = payload.overall_feedback

    # Update category ratings if provided
    if payload.ratings is not None:
        # Clear existing ratings
        db.query(PerformanceReviewRating).filter(PerformanceReviewRating.review_id == review.id).delete()
        db.flush()

        for item in payload.ratings:
            rating_obj = PerformanceReviewRating(
                review_id=review.id,
                category=item.category,
                rating=item.rating,
                comments=item.comments,
            )
            db.add(rating_obj)

    db.commit()
    db.refresh(review)

    create_audit_log(
        db=db,
        user_id=creator_id,
        action=AuditAction.PERFORMANCE_REVIEW_UPDATED,
    )

    return format_review_response(review)


def complete_performance_review(
    db: Session,
    review_id: int,
    creator_id: int,
) -> PerformanceReviewResponse:
    """
    HR completes an evaluation.
    Computes overall rating as the average of category ratings rounded to 1 decimal place.
    Updates status to COMPLETED, logs audit action, and dispatches notification.
    """
    stmt = select(PerformanceReview).where(PerformanceReview.id == review_id)
    review = db.scalar(stmt)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Performance review not found",
        )

    if review.status == ReviewStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Performance review is already completed",
        )

    # Compute overall rating from category ratings
    ratings_stmt = select(PerformanceReviewRating).where(PerformanceReviewRating.review_id == review.id)
    ratings_list = db.scalars(ratings_stmt).all()

    if not ratings_list:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot complete review without at least one category rating",
        )

    total_rating = sum(r.rating for r in ratings_list)
    avg_rating = round(total_rating / len(ratings_list), 1)

    review.overall_rating = avg_rating
    review.status = ReviewStatus.COMPLETED
    review.completed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(review)

    create_audit_log(
        db=db,
        user_id=creator_id,
        action=AuditAction.PERFORMANCE_REVIEW_COMPLETED,
    )

    # Dispatch in-app notification to employee
    if review.employee and review.employee.user_id:
        notify_users(
            db=db,
            user_ids=[review.employee.user_id],
            notification_type=NotificationType.PERFORMANCE_UPDATE,
            title="Performance Review Completed",
            message=f"Your performance review for period {review.review_start_date} to {review.review_end_date} has been completed.",
        )

        # Dispatch HTML Performance Feedback Email
        if review.employee.user and review.employee.user.email and review.employee.user.is_active:
            try:
                emp_name = f"{review.employee.first_name} {review.employee.last_name}".strip()
                review_period = f"{review.review_start_date} to {review.review_end_date}"
                review_date_str = (
                    review.completed_at.strftime("%B %d, %Y")
                    if review.completed_at
                    else datetime.now(timezone.utc).strftime("%B %d, %Y")
                )

                send_performance_feedback_email(
                    recipient_email=review.employee.user.email,
                    employee_name=emp_name,
                    review_period=review_period,
                    overall_rating=float(review.overall_rating or 0.0),
                    overall_feedback=review.overall_feedback,
                    review_date=review_date_str,
                    login_url=settings.FRONTEND_URL,
                )
                logger.info(
                    f"Performance feedback email sent to: {review.employee.user.email}"
                )
            except Exception as e:
                logger.error(
                    f"Failed to send performance feedback email to {review.employee.user.email}: {e}"
                )

    return format_review_response(review)



def get_performance_review_by_id(
    db: Session,
    review_id: int,
    current_user: User,
) -> PerformanceReviewResponse:
    """Fetch details of a single performance review with authorization checks."""
    stmt = select(PerformanceReview).where(PerformanceReview.id == review_id)
    review = db.scalar(stmt)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Performance review not found",
        )

    # Enforce IDOR protection
    verify_employee_access(db, current_user, review.employee_id)

    # Employees can NEVER see draft reviews
    if current_user.role != UserRole.HR and review.status == ReviewStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Performance review not found",
        )

    return format_review_response(review)


def list_performance_reviews(
    db: Session,
    current_user: User,
    employee_id: Optional[int] = None,
    status_filter: Optional[ReviewStatus] = None,
    page: int = 1,
    limit: int = 10,
) -> Tuple[List[PerformanceReviewResponse], int]:
    """List performance reviews with pagination and role-based filtering."""
    stmt = select(PerformanceReview)

    # If non-HR, restrict to own employee ID and COMPLETED reviews
    if current_user.role != UserRole.HR:
        emp = get_employee_by_user_id(db, current_user.id)
        stmt = stmt.where(PerformanceReview.employee_id == emp.id, PerformanceReview.status == ReviewStatus.COMPLETED)
    else:
        if employee_id is not None:
            stmt = stmt.where(PerformanceReview.employee_id == employee_id)
        if status_filter is not None:
            stmt = stmt.where(PerformanceReview.status == status_filter)

    # Count total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.scalar(count_stmt) or 0

    # Order and paginate
    stmt = stmt.order_by(PerformanceReview.created_at.desc()).offset((page - 1) * limit).limit(limit)
    reviews = db.scalars(stmt).all()

    items = [format_review_response(r) for r in reviews]
    return items, total


# ============================================================
# Goals Service
# ============================================================

def create_performance_goal(
    db: Session,
    payload: PerformanceGoalCreate,
    creator_id: int,
) -> PerformanceGoal:
    """HR creates or assigns a goal to an employee."""
    stmt = select(Employee).where(Employee.id == payload.employee_id, Employee.deleted_at.is_(None))
    employee = db.scalar(stmt)
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target employee not found",
        )

    goal = PerformanceGoal(
        employee_id=payload.employee_id,
        title=payload.title,
        description=payload.description,
        target_date=payload.target_date,
        progress_percentage=payload.progress_percentage,
        status=payload.status,
        created_by=creator_id,
        completed_at=datetime.now(timezone.utc) if payload.status == GoalStatus.COMPLETED or payload.progress_percentage == 100 else None,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)

    create_audit_log(
        db=db,
        user_id=creator_id,
        action=AuditAction.PERFORMANCE_GOAL_CREATED,
    )

    return goal


def update_performance_goal(
    db: Session,
    goal_id: int,
    payload: PerformanceGoalUpdate,
    creator_id: int,
) -> PerformanceGoal:
    """HR updates a goal."""
    stmt = select(PerformanceGoal).where(PerformanceGoal.id == goal_id)
    goal = db.scalar(stmt)
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Performance goal not found",
        )

    if payload.title is not None:
        goal.title = payload.title
    if payload.description is not None:
        goal.description = payload.description
    if payload.target_date is not None:
        goal.target_date = payload.target_date
    if payload.progress_percentage is not None:
        goal.progress_percentage = payload.progress_percentage
    if payload.status is not None:
        goal.status = payload.status

    if goal.progress_percentage == 100 or goal.status == GoalStatus.COMPLETED:
        if not goal.completed_at:
            goal.completed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(goal)

    create_audit_log(
        db=db,
        user_id=creator_id,
        action=AuditAction.PERFORMANCE_GOAL_UPDATED,
    )

    return goal


def update_performance_goal_status(
    db: Session,
    goal_id: int,
    payload: PerformanceGoalStatusUpdate,
    current_user: User,
) -> PerformanceGoal:
    """Update goal status and optional progress percentage."""
    stmt = select(PerformanceGoal).where(PerformanceGoal.id == goal_id)
    goal = db.scalar(stmt)
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Performance goal not found",
        )

    verify_employee_access(db, current_user, goal.employee_id)

    goal.status = payload.status
    if payload.progress_percentage is not None:
        goal.progress_percentage = payload.progress_percentage

    if goal.status == GoalStatus.COMPLETED or goal.progress_percentage == 100:
        if not goal.completed_at:
            goal.completed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(goal)

    create_audit_log(
        db=db,
        user_id=current_user.id,
        action=AuditAction.PERFORMANCE_GOAL_STATUS_CHANGED,
    )

    return goal


def list_performance_goals(
    db: Session,
    current_user: User,
    employee_id: Optional[int] = None,
    status_filter: Optional[GoalStatus] = None,
    page: int = 1,
    limit: int = 10,
) -> Tuple[List[PerformanceGoal], int]:
    """List goals with pagination and role isolation."""
    stmt = select(PerformanceGoal)

    if current_user.role != UserRole.HR:
        emp = get_employee_by_user_id(db, current_user.id)
        stmt = stmt.where(PerformanceGoal.employee_id == emp.id)
    else:
        if employee_id is not None:
            stmt = stmt.where(PerformanceGoal.employee_id == employee_id)

    if status_filter is not None:
        stmt = stmt.where(PerformanceGoal.status == status_filter)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.scalar(count_stmt) or 0

    stmt = stmt.order_by(PerformanceGoal.target_date.asc()).offset((page - 1) * limit).limit(limit)
    goals = db.scalars(stmt).all()

    return goals, total


# ============================================================
# Analytics & Summary Service
# ============================================================

def get_employee_performance_summary(
    db: Session,
    employee_id: int,
    current_user: User,
) -> EmployeePerformanceSummary:
    """Calculate objective metrics and contextual performance overview for an employee."""
    employee = verify_employee_access(db, current_user, employee_id)
    emp_name = f"{employee.first_name} {employee.last_name}"

    # 1. Performance Reviews
    latest_review_stmt = (
        select(PerformanceReview.overall_rating)
        .where(
            PerformanceReview.employee_id == employee_id,
            PerformanceReview.status == ReviewStatus.COMPLETED,
            PerformanceReview.overall_rating.is_not(None),
        )
        .order_by(PerformanceReview.completed_at.desc())
        .limit(1)
    )
    latest_rating_val = db.scalar(latest_review_stmt)
    latest_rating = float(latest_rating_val) if latest_rating_val is not None else None

    completed_reviews_count = db.scalar(
        select(func.count(PerformanceReview.id)).where(
            PerformanceReview.employee_id == employee_id,
            PerformanceReview.status == ReviewStatus.COMPLETED,
        )
    ) or 0

    # 2. Goals
    active_goals_count = db.scalar(
        select(func.count(PerformanceGoal.id)).where(
            PerformanceGoal.employee_id == employee_id,
            PerformanceGoal.status.in_([GoalStatus.NOT_STARTED, GoalStatus.IN_PROGRESS]),
        )
    ) or 0

    completed_goals_count = db.scalar(
        select(func.count(PerformanceGoal.id)).where(
            PerformanceGoal.employee_id == employee_id,
            PerformanceGoal.status == GoalStatus.COMPLETED,
        )
    ) or 0

    # 3. Projects
    total_assigned_projects = db.scalar(
        select(func.count(func.distinct(ProjectAssignment.project_id))).where(
            ProjectAssignment.employee_id == employee_id,
            ProjectAssignment.status == AssignmentStatus.ACTIVE,
        )
    ) or 0

    active_projects_count = db.scalar(
        select(func.count(func.distinct(ProjectAssignment.project_id)))
        .join(Project, ProjectAssignment.project_id == Project.id)
        .where(
            ProjectAssignment.employee_id == employee_id,
            ProjectAssignment.status == AssignmentStatus.ACTIVE,
            Project.status.in_([ProjectStatus.PLANNED, ProjectStatus.IN_PROGRESS]),
        )
    ) or 0

    completed_projects_count = db.scalar(
        select(func.count(func.distinct(ProjectAssignment.project_id)))
        .join(Project, ProjectAssignment.project_id == Project.id)
        .where(
            ProjectAssignment.employee_id == employee_id,
            Project.status == ProjectStatus.COMPLETED,
        )
    ) or 0

    project_summary = ProjectMetricSummary(
        assigned=total_assigned_projects,
        active=active_projects_count,
        completed=completed_projects_count,
    )

    # 4. Tasks (Gracefully handle zero task database table)
    task_summary = TaskMetricSummary(
        assigned=0,
        completed=0,
        in_progress=0,
        overdue=0,
        completion_rate=None,
    )

    # 5. Work Reports
    total_reports = db.scalar(
        select(func.count(DailyWorkReport.id)).where(
            DailyWorkReport.employee_id == employee_id,
        )
    ) or 0

    today = date.today()
    first_day_of_month = date(today.year, today.month, 1)

    reports_this_month = db.scalar(
        select(func.count(DailyWorkReport.id)).where(
            DailyWorkReport.employee_id == employee_id,
            DailyWorkReport.report_date >= first_day_of_month,
        )
    ) or 0

    work_report_summary = WorkReportMetricSummary(
        submitted=total_reports,
        submitted_this_month=reports_this_month,
    )

    # 6. Attendance Context
    total_attendance_days = db.scalar(
        select(func.count(Attendance.id)).where(
            Attendance.employee_id == employee_id,
        )
    ) or 0

    present_days = db.scalar(
        select(func.count(Attendance.id)).where(
            Attendance.employee_id == employee_id,
            Attendance.status.in_([AttendanceStatus.PRESENT, AttendanceStatus.LATE]),
        )
    ) or 0


    late_days = db.scalar(
        select(func.count(Attendance.id)).where(
            Attendance.employee_id == employee_id,
            Attendance.status == AttendanceStatus.LATE,
        )
    ) or 0


    approved_leave_days = db.scalar(
        select(func.coalesce(func.sum(LeaveRequest.duration), 0.0)).where(
            LeaveRequest.employee_id == employee_id,
            LeaveRequest.status == LeaveStatus.APPROVED,
        )
    ) or 0.0

    attendance_summary = AttendanceContextSummary(
        working_days=total_attendance_days,
        present_days=present_days,
        late_days=late_days,
        approved_leave_days=int(approved_leave_days),
    )

    # 7. Leave Context
    approved_leave_val = db.scalar(
        select(func.coalesce(func.sum(LeaveRequest.duration), 0.0)).where(
            LeaveRequest.employee_id == employee_id,
            LeaveRequest.status == LeaveStatus.APPROVED,
        )
    ) or 0.0


    pending_leave_count = db.scalar(
        select(func.count(LeaveRequest.id)).where(
            LeaveRequest.employee_id == employee_id,
            LeaveRequest.status == LeaveStatus.PENDING,
        )
    ) or 0

    rejected_leave_count = db.scalar(
        select(func.count(LeaveRequest.id)).where(
            LeaveRequest.employee_id == employee_id,
            LeaveRequest.status == LeaveStatus.REJECTED,
        )
    ) or 0

    leave_summary = LeaveContextSummary(
        approved_days=float(approved_leave_val),
        pending_requests=pending_leave_count,
        rejected_requests=rejected_leave_count,
    )

    return EmployeePerformanceSummary(
        employee_id=employee.id,
        employee_name=emp_name,
        employee_code=employee.employee_code,
        latest_rating=latest_rating,
        completed_reviews_count=completed_reviews_count,
        active_goals_count=active_goals_count,
        completed_goals_count=completed_goals_count,
        projects=project_summary,
        tasks=task_summary,
        work_reports=work_report_summary,
        attendance=attendance_summary,
        leave=leave_summary,
    )


def get_hr_performance_dashboard(db: Session) -> HRPerformanceDashboardResponse:
    """Calculate system-wide HR performance dashboard metrics."""
    total_employees = db.scalar(
        select(func.count(Employee.id)).where(Employee.deleted_at.is_(None))
    ) or 0

    reviews_completed = db.scalar(
        select(func.count(PerformanceReview.id)).where(PerformanceReview.status == ReviewStatus.COMPLETED)
    ) or 0

    reviews_pending = db.scalar(
        select(func.count(PerformanceReview.id)).where(PerformanceReview.status == ReviewStatus.DRAFT)
    ) or 0

    avg_rating_val = db.scalar(
        select(func.avg(PerformanceReview.overall_rating)).where(
            PerformanceReview.status == ReviewStatus.COMPLETED,
            PerformanceReview.overall_rating.is_not(None),
        )
    )
    average_rating = round(float(avg_rating_val), 1) if avg_rating_val is not None else None

    goals_completed = db.scalar(
        select(func.count(PerformanceGoal.id)).where(PerformanceGoal.status == GoalStatus.COMPLETED)
    ) or 0

    goals_in_progress = db.scalar(
        select(func.count(PerformanceGoal.id)).where(PerformanceGoal.status == GoalStatus.IN_PROGRESS)
    ) or 0

    return HRPerformanceDashboardResponse(
        total_employees=total_employees,
        reviews_completed=reviews_completed,
        reviews_pending=reviews_pending,
        average_rating=average_rating,
        goals_completed=goals_completed,
        goals_in_progress=goals_in_progress,
    )


def get_hr_performance_analytics(db: Session) -> HRPerformanceAnalyticsResponse:
    """
    Aggregate real analytics data for HR Performance & Analytics Dashboard charts.
    """
    # 1. Performance Rating by Employee
    emp_rating_stmt = (
        select(
            Employee.id.label("employee_id"),
            Employee.first_name,
            Employee.last_name,
            Employee.employee_code,
            func.avg(PerformanceReview.overall_rating).label("avg_rating"),
            func.count(PerformanceReview.id).label("completed_count"),
        )
        .join(PerformanceReview, PerformanceReview.employee_id == Employee.id)
        .where(
            PerformanceReview.status == ReviewStatus.COMPLETED,
            PerformanceReview.overall_rating.is_not(None),
            Employee.deleted_at.is_(None),
        )
        .group_by(Employee.id, Employee.first_name, Employee.last_name, Employee.employee_code)
        .order_by(func.avg(PerformanceReview.overall_rating).desc())
    )
    emp_ratings_rows = db.execute(emp_rating_stmt).all()

    ratings_by_employee = [
        EmployeeRatingMetric(
            employee_id=r.employee_id,
            employee_name=f"{r.first_name} {r.last_name}".strip(),
            employee_code=r.employee_code,
            average_rating=round(float(r.avg_rating), 1),
            completed_reviews_count=int(r.completed_count),
        )
        for r in emp_ratings_rows
    ]

    # 2. Performance Trend over time
    trend_stmt = (
        select(PerformanceReview.completed_at, PerformanceReview.overall_rating)
        .where(
            PerformanceReview.status == ReviewStatus.COMPLETED,
            PerformanceReview.completed_at.is_not(None),
            PerformanceReview.overall_rating.is_not(None),
        )
        .order_by(PerformanceReview.completed_at.asc())
    )
    trend_rows = db.execute(trend_stmt).all()

    trend_dict = {}
    for completed_at, overall_rating in trend_rows:
        if completed_at:
            period_str = completed_at.strftime("%b %Y")
            if period_str not in trend_dict:
                trend_dict[period_str] = []
            trend_dict[period_str].append(float(overall_rating))

    performance_trends = [
        PerformanceTrendMetric(
            period=period,
            average_rating=round(sum(ratings) / len(ratings), 1),
            review_count=len(ratings),
        )
        for period, ratings in trend_dict.items()
    ]

    # 3. Goal / KPI Progress by Status
    goal_counts_stmt = (
        select(PerformanceGoal.status, func.count(PerformanceGoal.id).label("count"))
        .group_by(PerformanceGoal.status)
    )
    goal_counts_rows = db.execute(goal_counts_stmt).all()
    goal_map = {
        row.status.value if hasattr(row.status, "value") else str(row.status): row.count
        for row in goal_counts_rows
    }

    status_labels = [
        (GoalStatus.COMPLETED.value, "Completed"),
        (GoalStatus.IN_PROGRESS.value, "In Progress"),
        (GoalStatus.NOT_STARTED.value, "Not Started"),
        (GoalStatus.CANCELLED.value, "Cancelled"),
    ]

    goal_status_distribution = [
        GoalProgressMetric(
            status=st,
            label=lbl,
            count=int(goal_map.get(st, 0)),
        )
        for st, lbl in status_labels
    ]

    # 4. Performance Category Analysis
    cat_stmt = (
        select(
            PerformanceReviewRating.category,
            func.avg(PerformanceReviewRating.rating).label("avg_rating"),
            func.count(PerformanceReviewRating.id).label("total_ratings"),
        )
        .join(PerformanceReview, PerformanceReviewRating.review_id == PerformanceReview.id)
        .where(PerformanceReview.status == ReviewStatus.COMPLETED)
        .group_by(PerformanceReviewRating.category)
        .order_by(func.avg(PerformanceReviewRating.rating).desc())
    )
    cat_rows = db.execute(cat_stmt).all()

    category_ratings = [
        CategoryRatingMetric(
            category=row.category,
            average_rating=round(float(row.avg_rating), 1),
            total_ratings=int(row.total_ratings),
        )
        for row in cat_rows
    ]

    # 5. Review Status Distribution
    review_status_stmt = (
        select(PerformanceReview.status, func.count(PerformanceReview.id).label("count"))
        .group_by(PerformanceReview.status)
    )
    review_status_rows = db.execute(review_status_stmt).all()
    review_status_map = {
        row.status.value if hasattr(row.status, "value") else str(row.status): row.count
        for row in review_status_rows
    }

    review_labels = [
        (ReviewStatus.COMPLETED.value, "Completed"),
        (ReviewStatus.DRAFT.value, "Draft"),
    ]

    review_status_distribution = [
        ReviewStatusMetric(
            status=st,
            label=lbl,
            count=int(review_status_map.get(st, 0)),
        )
        for st, lbl in review_labels
    ]

    return HRPerformanceAnalyticsResponse(
        ratings_by_employee=ratings_by_employee,
        performance_trends=performance_trends,
        goal_status_distribution=goal_status_distribution,
        category_ratings=category_ratings,
        review_status_distribution=review_status_distribution,
    )

