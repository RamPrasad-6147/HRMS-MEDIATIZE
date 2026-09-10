from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.leave_service.enums import LeaveDayType, LeaveStatus


# ==========================================
# Leave Type Schemas
# ==========================================

class LeaveTypeCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    annual_allocation: Decimal = Field(..., ge=0, decimal_places=2)
    is_paid: bool = True
    requires_document: bool = False
    is_active: bool = True


class LeaveTypeUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = None
    annual_allocation: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    is_paid: Optional[bool] = None
    requires_document: Optional[bool] = None
    is_active: Optional[bool] = None


class LeaveTypeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: Optional[str] = None
    annual_allocation: Decimal
    is_paid: bool
    requires_document: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime


# ==========================================
# Leave Balance Schemas
# ==========================================

class LeaveBalanceUpdate(BaseModel):
    allocated_days: Decimal = Field(..., ge=0, decimal_places=2)
    used_days: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    pending_days: Optional[Decimal] = Field(None, ge=0, decimal_places=2)


class LeaveBalanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    leave_type_id: int
    leave_type_name: Optional[str] = None
    year: int
    allocated_days: Decimal
    used_days: Decimal
    pending_days: Decimal
    remaining_days: Decimal = Decimal("0.00")
    created_at: datetime
    updated_at: datetime


# ==========================================
# Leave Attachment Schemas
# ==========================================

class LeaveAttachmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    leave_request_id: int
    file_url: str
    public_id: str
    original_filename: str
    content_type: str
    file_size: int
    created_at: datetime


# ==========================================
# Leave Request Schemas
# ==========================================

class LeaveRequestCreate(BaseModel):
    leave_type_id: int
    start_date: date
    end_date: date
    start_day_type: LeaveDayType = LeaveDayType.FULL_DAY
    end_day_type: LeaveDayType = LeaveDayType.FULL_DAY
    reason: str = Field(..., min_length=3, max_length=1000)

    @field_validator("end_date")
    @classmethod
    def validate_dates(cls, v: date, info) -> date:
        start_date = info.data.get("start_date")
        if start_date and v < start_date:
            raise ValueError("end_date cannot be earlier than start_date")
        return v


class LeaveRequestReview(BaseModel):
    hr_remarks: Optional[str] = Field(None, max_length=1000)


class LeaveCancelRequest(BaseModel):
    cancellation_reason: str = Field(..., min_length=1, max_length=1000)

    @field_validator("cancellation_reason")
    @classmethod
    def validate_cancellation_reason(cls, v: str) -> str:
        v_stripped = v.strip()
        if not v_stripped:
            raise ValueError("cancellation_reason cannot be empty or whitespace only")
        return v_stripped


class LeaveRevokeRequest(BaseModel):
    revocation_reason: str = Field(..., min_length=1, max_length=1000)

    @field_validator("revocation_reason")
    @classmethod
    def validate_revocation_reason(cls, v: str) -> str:
        v_stripped = v.strip()
        if not v_stripped:
            raise ValueError("revocation_reason cannot be empty or whitespace only")
        return v_stripped


class LeaveRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    leave_type_id: int
    leave_type_name: Optional[str] = None
    start_date: date
    end_date: date
    duration: Decimal
    start_day_type: LeaveDayType
    end_day_type: LeaveDayType
    reason: str
    status: LeaveStatus
    hr_remarks: Optional[str] = None
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    cancellation_reason: Optional[str] = None
    cancelled_by: Optional[int] = None
    cancelled_at: Optional[datetime] = None
    revocation_reason: Optional[str] = None
    revoked_by: Optional[int] = None
    revoked_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    attachments: List[LeaveAttachmentResponse] = []


class PaginatedLeaveResponse(BaseModel):
    items: List[LeaveRequestResponse]
    total: int
    page: int
    limit: int
    pages: int
