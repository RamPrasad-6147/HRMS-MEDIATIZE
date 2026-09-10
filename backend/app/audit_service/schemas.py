from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict

from app.audit_service.models import AuditAction


class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    employee_code: Optional[str] = None
    action: AuditAction
    ip_address: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuditLogPaginatedResponse(BaseModel):
    items: List[AuditLogResponse]
    page: int
    limit: int
    total: int
    total_pages: int
