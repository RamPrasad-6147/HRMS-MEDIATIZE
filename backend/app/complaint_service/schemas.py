from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.complaint_service.models import ComplaintPriority, ComplaintStatus


# ============================================================
# Category Schemas
# ============================================================

class ComplaintCategoryBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None


class ComplaintCategoryCreate(ComplaintCategoryBase):
    pass


class ComplaintCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ComplaintCategoryResponse(ComplaintCategoryBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# Complaint Request Schemas
# ============================================================

class ComplaintCreateSchema(BaseModel):
    category_id: int
    subject: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=10)
    priority: Optional[ComplaintPriority] = ComplaintPriority.MEDIUM


class ComplaintStatusUpdate(BaseModel):
    status: ComplaintStatus


class ComplaintPriorityUpdate(BaseModel):
    priority: ComplaintPriority


class ComplaintRespondRequest(BaseModel):
    hr_response: str = Field(..., min_length=2)


class ComplaintResolveRequest(BaseModel):
    resolution: str = Field(..., min_length=2)


# ============================================================
# Complaint Response Schemas
# ============================================================

class ComplaintResponse(BaseModel):
    id: int
    complaint_code: str
    employee_id: int
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    category_id: int
    category_name: Optional[str] = None
    subject: str
    description: str
    priority: ComplaintPriority
    status: ComplaintStatus
    hr_response: Optional[str] = None
    resolution: Optional[str] = None
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class PaginatedComplaintResponse(BaseModel):
    items: List[ComplaintResponse]
    total: int
    page: int
    limit: int
    pages: int
