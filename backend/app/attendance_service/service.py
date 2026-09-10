from datetime import date, datetime, timezone
from math import ceil
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status
from sqlalchemy import String, desc, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.attendance_service.models import Attendance, AttendanceStatus
from app.audit_service.models import AuditAction
from app.audit_service.service import create_audit_log
from app.authentication_service.models import User, UserRole
from app.employee_service.models import Employee, EmploymentStatus


def _get_active_employee_for_user(db: Session, user: User) -> Employee:
    statement = select(Employee).where(
        Employee.user_id == user.id,
        Employee.deleted_at.is_(None),
    )
    employee = db.scalar(statement)
    if not employee or employee.employment_status == EmploymentStatus.TERMINATED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee profile is inactive, archived, or terminated.",
        )
    return employee


def _format_attendance_dict(att: Attendance) -> Dict[str, Any]:
    emp = att.employee
    user = emp.user if emp else None
    return {
        "id": att.id,
        "employee_id": att.employee_id,
        "employee_code": emp.employee_code if emp else None,
        "first_name": emp.first_name if emp else None,
        "last_name": emp.last_name if emp else None,
        "email": user.email if user else None,
        "attendance_date": att.attendance_date,
        "check_in": att.check_in,
        "check_out": att.check_out,
        "status": att.status,
        "working_minutes": att.working_minutes,
        "created_at": att.created_at,
        "updated_at": att.updated_at,
    }


def check_in_employee(
    db: Session,
    current_user: User,
    ip_address: Optional[str] = None,
) -> Dict[str, Any]:
    employee = _get_active_employee_for_user(db, current_user)
    now_utc = datetime.now(timezone.utc)
    today_date = now_utc.date()

    existing = db.scalar(
        select(Attendance).where(
            Attendance.employee_id == employee.id,
            Attendance.attendance_date == today_date,
        )
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already checked in today.",
        )

    attendance = Attendance(
        employee_id=employee.id,
        attendance_date=today_date,
        check_in=now_utc,
        status=AttendanceStatus.PRESENT,
    )

    try:
        db.add(attendance)
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already checked in today.",
        )

    create_audit_log(
        db=db,
        action=AuditAction.ATTENDANCE_CHECKED_IN,
        user_id=current_user.id,
        ip_address=ip_address,
    )

    db.commit()
    db.refresh(attendance)
    return _format_attendance_dict(attendance)


def check_out_employee(
    db: Session,
    current_user: User,
    ip_address: Optional[str] = None,
) -> Dict[str, Any]:
    employee = _get_active_employee_for_user(db, current_user)
    now_utc = datetime.now(timezone.utc)
    today_date = now_utc.date()

    attendance = db.scalar(
        select(Attendance).where(
            Attendance.employee_id == employee.id,
            Attendance.attendance_date == today_date,
        )
    )
    if not attendance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No check-in record found for today. Please check in first.",
        )

    if attendance.check_out is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already checked out today.",
        )

    attendance.check_out = now_utc
    if attendance.check_in:
        delta = now_utc - attendance.check_in
        attendance.working_minutes = max(0, int(delta.total_seconds() // 60))
    else:
        attendance.working_minutes = 0

    create_audit_log(
        db=db,
        action=AuditAction.ATTENDANCE_CHECKED_OUT,
        user_id=current_user.id,
        ip_address=ip_address,
    )

    db.commit()
    db.refresh(attendance)
    return _format_attendance_dict(attendance)


def get_today_attendance(
    db: Session,
    current_user: User,
) -> Dict[str, Any]:
    employee = _get_active_employee_for_user(db, current_user)
    today_date = datetime.now(timezone.utc).date()

    attendance = db.scalar(
        select(Attendance).where(
            Attendance.employee_id == employee.id,
            Attendance.attendance_date == today_date,
        )
    )

    return {
        "has_checked_in": attendance is not None and attendance.check_in is not None,
        "has_checked_out": attendance is not None and attendance.check_out is not None,
        "attendance": _format_attendance_dict(attendance) if attendance else None,
    }


def get_employee_attendance_history(
    db: Session,
    current_user: User,
    page: int = 1,
    limit: int = 20,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    status_filter: Optional[AttendanceStatus] = None,
) -> Dict[str, Any]:
    employee = _get_active_employee_for_user(db, current_user)
    page = max(1, page)
    limit = max(1, min(100, limit))

    filters = [Attendance.employee_id == employee.id]

    if from_date:
        filters.append(Attendance.attendance_date >= from_date)
    if to_date:
        filters.append(Attendance.attendance_date <= to_date)
    if status_filter:
        filters.append(Attendance.status == status_filter)

    count_stmt = select(func.count(Attendance.id)).where(*filters)
    total = db.scalar(count_stmt) or 0
    total_pages = ceil(total / limit) if total > 0 else 0

    offset = (page - 1) * limit
    stmt = (
        select(Attendance)
        .where(*filters)
        .order_by(desc(Attendance.attendance_date), desc(Attendance.id))
        .offset(offset)
        .limit(limit)
    )
    records = db.scalars(stmt).all()

    items = [_format_attendance_dict(r) for r in records]

    return {
        "items": items,
        "page": page,
        "limit": limit,
        "total": total,
        "total_pages": total_pages,
    }


def get_hr_attendance_list(
    db: Session,
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    employee_id: Optional[int] = None,
    status_filter: Optional[AttendanceStatus] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
) -> Dict[str, Any]:
    page = max(1, page)
    limit = max(1, min(100, limit))

    filters = []

    if employee_id:
        filters.append(Attendance.employee_id == employee_id)
    if status_filter:
        filters.append(Attendance.status == status_filter)
    if from_date:
        filters.append(Attendance.attendance_date >= from_date)
    if to_date:
        filters.append(Attendance.attendance_date <= to_date)

    if search:
        pattern = f"%{search.strip()}%"
        filters.append(
            or_(
                Employee.employee_code.ilike(pattern),
                Employee.first_name.ilike(pattern),
                Employee.last_name.ilike(pattern),
                User.email.ilike(pattern),
            )
        )

    base_query = (
        select(Attendance)
        .join(Employee, Attendance.employee_id == Employee.id)
        .join(User, Employee.user_id == User.id)
    )

    if filters:
        base_query = base_query.where(*filters)

    count_query = (
        select(func.count(Attendance.id))
        .join(Employee, Attendance.employee_id == Employee.id)
        .join(User, Employee.user_id == User.id)
    )
    if filters:
        count_query = count_query.where(*filters)

    total = db.scalar(count_query) or 0
    total_pages = ceil(total / limit) if total > 0 else 0

    offset = (page - 1) * limit
    stmt = (
        base_query.order_by(desc(Attendance.attendance_date), desc(Attendance.id))
        .offset(offset)
        .limit(limit)
    )

    records = db.scalars(stmt).all()
    items = [_format_attendance_dict(r) for r in records]

    return {
        "items": items,
        "page": page,
        "limit": limit,
        "total": total,
        "total_pages": total_pages,
    }


def get_attendance_by_id(
    db: Session,
    attendance_id: int,
    current_user: User,
) -> Dict[str, Any]:
    stmt = select(Attendance).where(Attendance.id == attendance_id)
    attendance = db.scalar(stmt)
    if not attendance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance record not found.",
        )

    # Authorization Check (IDOR protection)
    if current_user.role != UserRole.HR:
        employee = _get_active_employee_for_user(db, current_user)
        if attendance.employee_id != employee.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You can only view your own attendance record.",
            )

    return _format_attendance_dict(attendance)
