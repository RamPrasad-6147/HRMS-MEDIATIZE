from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.employee_service.models import EmploymentStatus


# ============================================================
# Employee Create Schema (HR Only)
# ============================================================

class EmployeeCreate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=20)
    date_of_birth: Optional[date] = None
    address: Optional[str] = Field(None, max_length=255)
    joining_date: Optional[date] = None
    department_id: Optional[int] = None
    designation_id: Optional[int] = None


# ============================================================
# Employee Update Schema (HR Only)
# ============================================================

class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    date_of_birth: Optional[date] = None
    address: Optional[str] = Field(None, max_length=255)
    joining_date: Optional[date] = None
    department_id: Optional[int] = None
    designation_id: Optional[int] = None
    employment_status: Optional[EmploymentStatus] = None


# ============================================================
# Employee Self Update Schema (Employee Self Service)
# ============================================================

class EmployeeSelfUpdate(BaseModel):
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = Field(None, max_length=255)


# ============================================================
# Employee Detail Response Schema
# ============================================================

class EmployeeResponse(BaseModel):
    id: int
    user_id: int
    employee_code: str
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    address: Optional[str] = None
    joining_date: Optional[date] = None
    department_id: Optional[int] = None
    designation_id: Optional[int] = None
    employment_status: EmploymentStatus
    profile_photo_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    user_is_active: bool = True

    model_config = ConfigDict(from_attributes=True)


def format_employee_response(employee) -> EmployeeResponse:
    """
    Format an Employee ORM model instance into an EmployeeResponse Pydantic schema,
    extracting associated user.email and user.is_active cleanly.
    """
    return EmployeeResponse(
        id=employee.id,
        user_id=employee.user_id,
        employee_code=employee.employee_code,
        first_name=employee.first_name,
        last_name=employee.last_name,
        email=employee.user.email if employee.user else "",
        phone=employee.phone,
        date_of_birth=employee.date_of_birth,
        address=employee.address,
        joining_date=employee.joining_date,
        department_id=employee.department_id,
        designation_id=employee.designation_id,
        employment_status=employee.employment_status,
        profile_photo_url=employee.profile_photo_url,
        created_at=employee.created_at,
        updated_at=employee.updated_at,
        user_is_active=employee.user.is_active if employee.user else True,
    )


# ============================================================
# Paginated Employee List Response Schema
# ============================================================

class EmployeeListResponse(BaseModel):
    items: List[EmployeeResponse]
    page: int
    limit: int
    total: int
    total_pages: int
