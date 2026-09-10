from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.audit_service import service
from app.audit_service.models import AuditAction
from app.audit_service.schemas import AuditLogPaginatedResponse
from app.authentication_service.dependencies import get_current_hr
from app.authentication_service.models import User
from app.core.database import get_db

router = APIRouter(
    tags=["Audit Logs"],
)


@router.get(
    "/audit-logs",
    response_model=AuditLogPaginatedResponse,
    status_code=status.HTTP_200_OK,
    summary="Get HR Audit Logs (HR Only)",
)
def get_audit_logs_endpoint(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search email/employee code/action"),
    action: Optional[AuditAction] = Query(None, description="Filter by audit action"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    from_date: Optional[datetime] = Query(None, description="Filter from timestamp"),
    to_date: Optional[datetime] = Query(None, description="Filter to timestamp"),
    current_hr: User = Depends(get_current_hr),
    db: Session = Depends(get_db),
):
    """
    Retrieve read-only system audit logs for HR users.
    """
    return service.get_audit_logs(
        db=db,
        page=page,
        limit=limit,
        search=search,
        action=action,
        user_id=user_id,
        from_date=from_date,
        to_date=to_date,
    )
