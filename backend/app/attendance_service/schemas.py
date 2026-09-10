from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict

from app.attendance_service.models import AttendanceStatus


class AttendanceResponse(BaseModel):
    id: int
    employee_id: int
    employee_code: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    attendance_date: date
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    status: AttendanceStatus
    working_minutes: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AttendanceTodayResponse(BaseModel):
    has_checked_in: bool
    has_checked_out: bool
    attendance: Optional[AttendanceResponse] = None


class AttendancePaginatedResponse(BaseModel):
    items: List[AttendanceResponse]
    page: int
    limit: int
    total: int
    total_pages: int
