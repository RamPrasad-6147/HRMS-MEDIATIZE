from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.project_service.models import AssignmentStatus, ProjectPriority, ProjectStatus


# =========================================================
# PROJECT ROLE SCHEMAS
# =========================================================
class ProjectRoleBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Project role title")
    description: Optional[str] = None


class ProjectRoleCreate(ProjectRoleBase):
    pass


class ProjectRoleUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ProjectRoleResponse(ProjectRoleBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =========================================================
# PROJECT SCHEMAS
# =========================================================
class ProjectBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150, description="Project name")
    description: Optional[str] = None
    start_date: date
    end_date: Optional[date] = None
    priority: ProjectPriority = ProjectPriority.MEDIUM

    @field_validator("end_date")
    @classmethod
    def validate_dates(cls, v: Optional[date], info) -> Optional[date]:
        if v and "start_date" in info.data and info.data["start_date"]:
            if v < info.data["start_date"]:
                raise ValueError("end_date cannot be earlier than start_date")
        return v


class ProjectCreate(ProjectBase):
    project_code: Optional[str] = Field(None, max_length=20, description="Optional custom project code. If null, auto-generated.")


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    priority: Optional[ProjectPriority] = None
    progress_percentage: Optional[int] = Field(None, ge=0, le=100)

    @field_validator("end_date")
    @classmethod
    def validate_dates(cls, v: Optional[date], info) -> Optional[date]:
        if v and "start_date" in info.data and info.data["start_date"]:
            if v < info.data["start_date"]:
                raise ValueError("end_date cannot be earlier than start_date")
        return v


class ProjectStatusUpdate(BaseModel):
    status: ProjectStatus


class ProjectProgressUpdate(BaseModel):
    progress_percentage: int = Field(..., ge=0, le=100)


class ProjectResponse(ProjectBase):
    id: int
    project_code: str
    status: ProjectStatus
    progress_percentage: int
    is_overdue: bool = False
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectListResponse(BaseModel):
    items: List[ProjectResponse]
    total: int
    page: int
    limit: int
    total_pages: int


# =========================================================
# PROJECT ASSIGNMENT SCHEMAS
# =========================================================
class ProjectAssignmentCreate(BaseModel):
    employee_id: int
    project_role_id: int
    assigned_date: Optional[date] = None


class ProjectTeamMemberResponse(BaseModel):
    assignment_id: int
    employee_id: int
    employee_code: str
    employee_name: str
    official_designation: Optional[str] = None
    email: str
    profile_photo_url: Optional[str] = None
    project_role_id: int
    project_role_name: str
    assigned_date: date
    removed_date: Optional[date] = None
    assignment_status: AssignmentStatus

    model_config = ConfigDict(from_attributes=True)


class ProjectAssignmentResponse(BaseModel):
    id: int
    project_id: int
    employee_id: int
    project_role_id: int
    assigned_date: date
    removed_date: Optional[date] = None
    status: AssignmentStatus
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =========================================================
# EMPLOYEE SELF-SERVICE SCHEMAS
# =========================================================
class EmployeeProjectResponse(BaseModel):
    project_id: int
    project_code: str
    name: str
    description: Optional[str] = None
    start_date: date
    end_date: Optional[date] = None
    priority: ProjectPriority
    status: ProjectStatus
    progress_percentage: int
    is_overdue: bool = False
    project_role_name: str
    assigned_date: date
    team_members_count: int = 0

    model_config = ConfigDict(from_attributes=True)


# =========================================================
# DASHBOARD METRICS SCHEMA
# =========================================================
class HRProjectDashboardMetrics(BaseModel):
    total_projects: int = 0
    active_projects: int = 0
    completed_projects: int = 0
    on_hold_projects: int = 0
    overdue_projects: int = 0
