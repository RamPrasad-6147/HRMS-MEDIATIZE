from datetime import datetime
from math import ceil
from typing import Any, Dict, List, Optional

from sqlalchemy import String, desc, func, or_, select
from sqlalchemy.orm import Session

from app.audit_service.models import AuditAction, AuditLog
from app.authentication_service.models import User
from app.employee_service.models import Employee


def create_audit_log(
    db: Session,
    action: AuditAction,
    user_id: int | None = None,
    ip_address: str | None = None,
) -> AuditLog:
    """
    Create an audit log entry in the current database transaction.

    The caller is responsible for committing the transaction.

    Security:
    - Never store passwords
    - Never store password hashes
    - Never store JWT tokens
    - Never store temporary passwords
    - Never store sensitive authentication data
    - Only store the user ID, action, IP address, and timestamp
    """

    audit_log = AuditLog(
        user_id=user_id,
        action=action,
        ip_address=ip_address,
    )

    db.add(audit_log)
    db.flush()

    return audit_log


def get_audit_logs(
    db: Session,
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    action: Optional[AuditAction] = None,
    user_id: Optional[int] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
) -> Dict[str, Any]:
    """
    Retrieve audit logs with pagination, search, action/user_id/date filters.
    Strictly read-only and newest-first (created_at DESC).
    """
    page = max(1, page)
    limit = max(1, min(100, limit))

    query = (
        select(
            AuditLog.id,
            AuditLog.user_id,
            User.email.label("user_email"),
            func.coalesce(Employee.employee_code, User.employee_id).label("employee_code"),
            AuditLog.action,
            AuditLog.ip_address,
            AuditLog.created_at,
        )
        .outerjoin(User, AuditLog.user_id == User.id)
        .outerjoin(Employee, User.id == Employee.user_id)
    )

    filters = []

    if user_id is not None:
        filters.append(AuditLog.user_id == user_id)

    if action is not None:
        filters.append(AuditLog.action == action)

    if from_date is not None:
        filters.append(AuditLog.created_at >= from_date)

    if to_date is not None:
        filters.append(AuditLog.created_at <= to_date)

    if search:
        search_pattern = f"%{search.strip()}%"
        filters.append(
            or_(
                User.email.ilike(search_pattern),
                User.employee_id.ilike(search_pattern),
                Employee.employee_code.ilike(search_pattern),
                AuditLog.action.cast(String).ilike(search_pattern),
            )
        )

    if filters:
        query = query.where(*filters)

    # Count query for total
    count_subquery = (
        select(func.count(AuditLog.id))
        .outerjoin(User, AuditLog.user_id == User.id)
        .outerjoin(Employee, User.id == Employee.user_id)
    )
    if filters:
        count_subquery = count_subquery.where(*filters)

    total = db.scalar(count_subquery) or 0
    total_pages = ceil(total / limit) if total > 0 else 0

    offset = (page - 1) * limit
    query = (
        query.order_by(desc(AuditLog.created_at), desc(AuditLog.id))
        .offset(offset)
        .limit(limit)
    )

    results = db.execute(query).all()

    items = [
        {
            "id": row.id,
            "user_id": row.user_id,
            "user_email": row.user_email,
            "employee_code": row.employee_code,
            "action": row.action,
            "ip_address": row.ip_address,
            "created_at": row.created_at,
        }
        for row in results
    ]

    return {
        "items": items,
        "page": page,
        "limit": limit,
        "total": total,
        "total_pages": total_pages,
    }