from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class WorkReportCreate(BaseModel):
    project_id: int = Field(..., description="ID of the assigned project")
    work_description: str = Field(..., min_length=1, description="Description of work done")
    problems_faced: Optional[str] = Field(None, description="Issues or challenges encountered")

    @field_validator("work_description")
    @classmethod
    def validate_work_description(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Work description cannot be empty or whitespace only.")
        return v.strip()

    @field_validator("problems_faced")
    @classmethod
    def validate_problems_faced(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        stripped = v.strip()
        return stripped if stripped else None


class WorkReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    project_id: int
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    work_description: str
    problems_faced: Optional[str] = None
    document_url: Optional[str] = None
    document_public_id: Optional[str] = None
    document_name: Optional[str] = None
    report_date: date
    created_at: datetime
    updated_at: datetime


class PaginatedWorkReportResponse(BaseModel):
    items: List[WorkReportResponse]
    total: int
    page: int
    limit: int
    pages: int


class AssignedProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    project_id: int
    project_name: str
    project_code: str
    role_name: Optional[str] = "Member"
