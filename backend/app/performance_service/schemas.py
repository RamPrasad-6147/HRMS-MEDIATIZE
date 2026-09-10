from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.performance_service.models import GoalStatus, ReviewStatus


# ============================================================
# Ratings Schemas
# ============================================================

class RatingCategoryItem(BaseModel):
    category: str = Field(..., min_length=2, max_length=100)
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 (Needs Significant Improvement) to 5 (Outstanding)")
    comments: Optional[str] = None


class RatingResponse(BaseModel):
    id: int
    review_id: int
    category: str
    rating: int
    comments: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# Performance Review Schemas
# ============================================================

class PerformanceReviewCreate(BaseModel):
    employee_id: int
    review_start_date: date
    review_end_date: date
    ratings: List[RatingCategoryItem] = Field(..., min_length=1)
    overall_feedback: Optional[str] = None

    @model_validator(mode="after")
    def validate_dates(self) -> "PerformanceReviewCreate":
        if self.review_start_date > self.review_end_date:
            raise ValueError("review_start_date must be on or before review_end_date")
        return self


class PerformanceReviewUpdate(BaseModel):
    review_start_date: Optional[date] = None
    review_end_date: Optional[date] = None
    ratings: Optional[List[RatingCategoryItem]] = None
    overall_feedback: Optional[str] = None

    @model_validator(mode="after")
    def validate_dates(self) -> "PerformanceReviewUpdate":
        if self.review_start_date and self.review_end_date:
            if self.review_start_date > self.review_end_date:
                raise ValueError("review_start_date must be on or before review_end_date")
        return self


class PerformanceReviewResponse(BaseModel):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    review_start_date: date
    review_end_date: date
    status: ReviewStatus
    overall_rating: Optional[float] = None
    overall_feedback: Optional[str] = None
    created_by: Optional[int] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    ratings: List[RatingResponse] = []

    model_config = ConfigDict(from_attributes=True)


class PerformanceReviewListResponse(BaseModel):
    total: int
    page: int
    limit: int
    total_pages: int
    items: List[PerformanceReviewResponse]


# ============================================================
# Goals Schemas
# ============================================================

class PerformanceGoalCreate(BaseModel):
    employee_id: int
    title: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = None
    target_date: date
    progress_percentage: int = Field(default=0, ge=0, le=100)
    status: GoalStatus = GoalStatus.NOT_STARTED


class PerformanceGoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    target_date: Optional[date] = None
    progress_percentage: Optional[int] = Field(default=None, ge=0, le=100)
    status: Optional[GoalStatus] = None


class PerformanceGoalStatusUpdate(BaseModel):
    status: GoalStatus
    progress_percentage: Optional[int] = Field(default=None, ge=0, le=100)


class PerformanceGoalResponse(BaseModel):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    title: str
    description: Optional[str] = None
    target_date: date
    status: GoalStatus
    progress_percentage: int
    created_by: Optional[int] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PerformanceGoalListResponse(BaseModel):
    total: int
    page: int
    limit: int
    total_pages: int
    items: List[PerformanceGoalResponse]


# ============================================================
# Analytics & Summary Schemas
# ============================================================

class ProjectMetricSummary(BaseModel):
    assigned: int = 0
    active: int = 0
    completed: int = 0


class TaskMetricSummary(BaseModel):
    assigned: int = 0
    completed: int = 0
    in_progress: int = 0
    overdue: int = 0
    completion_rate: Optional[float] = None  # Percentage, or None if assigned == 0


class WorkReportMetricSummary(BaseModel):
    submitted: int = 0
    submitted_this_month: int = 0


class AttendanceContextSummary(BaseModel):
    working_days: int = 0
    present_days: int = 0
    late_days: int = 0
    approved_leave_days: int = 0


class LeaveContextSummary(BaseModel):
    approved_days: float = 0.0
    pending_requests: int = 0
    rejected_requests: int = 0


class EmployeePerformanceSummary(BaseModel):
    employee_id: int
    employee_name: str
    employee_code: str
    latest_rating: Optional[float] = None
    completed_reviews_count: int = 0
    active_goals_count: int = 0
    completed_goals_count: int = 0
    projects: ProjectMetricSummary = Field(default_factory=ProjectMetricSummary)
    tasks: TaskMetricSummary = Field(default_factory=TaskMetricSummary)
    work_reports: WorkReportMetricSummary = Field(default_factory=WorkReportMetricSummary)
    attendance: AttendanceContextSummary = Field(default_factory=AttendanceContextSummary)
    leave: LeaveContextSummary = Field(default_factory=LeaveContextSummary)


class HRPerformanceDashboardResponse(BaseModel):
    total_employees: int
    reviews_completed: int
    reviews_pending: int
    average_rating: Optional[float] = None
    goals_completed: int
    goals_in_progress: int


class EmployeeRatingMetric(BaseModel):
    employee_id: int
    employee_name: str
    employee_code: Optional[str] = None
    average_rating: float
    completed_reviews_count: int


class PerformanceTrendMetric(BaseModel):
    period: str
    average_rating: float
    review_count: int


class GoalProgressMetric(BaseModel):
    status: str
    label: str
    count: int


class CategoryRatingMetric(BaseModel):
    category: str
    average_rating: float
    total_ratings: int


class ReviewStatusMetric(BaseModel):
    status: str
    label: str
    count: int


class HRPerformanceAnalyticsResponse(BaseModel):
    ratings_by_employee: List[EmployeeRatingMetric]
    performance_trends: List[PerformanceTrendMetric]
    goal_status_distribution: List[GoalProgressMetric]
    category_ratings: List[CategoryRatingMetric]
    review_status_distribution: List[ReviewStatusMetric]

