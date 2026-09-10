from datetime import date, datetime, timezone
from decimal import Decimal
import logging
import math
from typing import Dict, List, Optional, Tuple, Union

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.audit_service.models import AuditAction
from app.audit_service.service import create_audit_log
from app.authentication_service.models import User, UserRole
from app.core.config import settings
from app.email_service.service import (
    send_leave_approved_email,
    send_leave_rejected_email,
    send_leave_request_email,
)
from app.employee_service.models import Employee, EmploymentStatus
from app.leave_service.enums import LeaveDayType, LeaveStatus
from app.leave_service.models import LeaveAttachment, LeaveBalance, LeaveRequest, LeaveType
from app.leave_service.schemas import (
    LeaveBalanceResponse,
    LeaveBalanceUpdate,
    LeaveCancelRequest,
    LeaveRequestCreate,
    LeaveRequestResponse,
    LeaveRequestReview,
    LeaveRevokeRequest,
    LeaveTypeCreate,
    LeaveTypeResponse,
    LeaveTypeUpdate,
    PaginatedLeaveResponse,
)
from app.notification_service.enums import NotificationType
from app.notification_service.service import create_notification, notify_all_hr

logger = logging.getLogger(__name__)



def compute_leave_duration(
    start_date: date,
    end_date: date,
    start_day_type: LeaveDayType,
    end_day_type: LeaveDayType,
) -> Decimal:
    """
    Compute duration based on start/end dates and day types.
    Rules:
    - Cross-year leave is rejected (handled prior to this call).
    - Single-day leave (start_date == end_date):
      - FIRST_HALF or SECOND_HALF -> 0.5 days.
      - FULL_DAY -> 1.0 day.
    - Multi-day leave (start_date < end_date):
      - Must be FULL_DAY for both start_day_type and end_day_type.
      - duration = (end_date - start_date).days + 1.
    """
    if start_date == end_date:
        if start_day_type in (LeaveDayType.FIRST_HALF, LeaveDayType.SECOND_HALF):
            if end_day_type != start_day_type:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="For single-day half-day leave, start_day_type and end_day_type must match.",
                )
            return Decimal("0.50")
        return Decimal("1.00")
    else:
        if start_day_type != LeaveDayType.FULL_DAY or end_day_type != LeaveDayType.FULL_DAY:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Half-day leave options are only allowed for single-day leave requests.",
            )
        days = (end_date - start_date).days + 1
        return Decimal(str(days))


# ==========================================
# LEAVE TYPE SERVICES
# ==========================================

def create_leave_type(
    db: Session,
    type_in: LeaveTypeCreate,
    current_user: User,
    ip_address: Optional[str] = None,
) -> LeaveType:
    existing = db.scalar(select(LeaveType).where(LeaveType.name == type_in.name))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Leave type with name '{type_in.name}' already exists.",
        )

    leave_type = LeaveType(
        name=type_in.name,
        description=type_in.description,
        annual_allocation=type_in.annual_allocation,
        is_paid=type_in.is_paid,
        requires_document=type_in.requires_document,
        is_active=type_in.is_active,
    )
    db.add(leave_type)
    db.commit()
    db.refresh(leave_type)

    create_audit_log(
        db=db,
        action=AuditAction.LEAVE_TYPE_CREATED,
        user_id=current_user.id,
        ip_address=ip_address,
    )
    return leave_type


def get_active_leave_types(db: Session) -> List[LeaveType]:
    return list(db.scalars(select(LeaveType).where(LeaveType.is_active == True).order_by(LeaveType.name)).all())


def get_all_leave_types(db: Session) -> List[LeaveType]:
    return list(db.scalars(select(LeaveType).order_by(LeaveType.name)).all())


def update_leave_type(
    db: Session,
    leave_type_id: int,
    type_in: LeaveTypeUpdate,
    current_user: User,
    ip_address: Optional[str] = None,
) -> LeaveType:
    leave_type = db.get(LeaveType, leave_type_id)
    if not leave_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave type not found.",
        )

    if type_in.name is not None and type_in.name != leave_type.name:
        existing = db.scalar(select(LeaveType).where(LeaveType.name == type_in.name))
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Leave type with name '{type_in.name}' already exists.",
            )
        leave_type.name = type_in.name

    if type_in.description is not None:
        leave_type.description = type_in.description
    if type_in.annual_allocation is not None:
        leave_type.annual_allocation = type_in.annual_allocation
    if type_in.is_paid is not None:
        leave_type.is_paid = type_in.is_paid
    if type_in.requires_document is not None:
        leave_type.requires_document = type_in.requires_document
    if type_in.is_active is not None:
        leave_type.is_active = type_in.is_active

    db.commit()
    db.refresh(leave_type)

    create_audit_log(
        db=db,
        action=AuditAction.LEAVE_TYPE_UPDATED,
        user_id=current_user.id,
        ip_address=ip_address,
    )
    return leave_type


def activate_leave_type(
    db: Session,
    leave_type_id: int,
    current_user: User,
    ip_address: Optional[str] = None,
) -> LeaveType:
    leave_type = db.get(LeaveType, leave_type_id)
    if not leave_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave type not found.",
        )
    leave_type.is_active = True
    db.commit()
    db.refresh(leave_type)

    create_audit_log(
        db=db,
        action=AuditAction.LEAVE_TYPE_ACTIVATED,
        user_id=current_user.id,
        ip_address=ip_address,
    )
    return leave_type


def deactivate_leave_type(
    db: Session,
    leave_type_id: int,
    current_user: User,
    ip_address: Optional[str] = None,
) -> LeaveType:
    leave_type = db.get(LeaveType, leave_type_id)
    if not leave_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave type not found.",
        )
    leave_type.is_active = False
    db.commit()
    db.refresh(leave_type)

    create_audit_log(
        db=db,
        action=AuditAction.LEAVE_TYPE_DEACTIVATED,
        user_id=current_user.id,
        ip_address=ip_address,
    )
    return leave_type


# ==========================================
# LEAVE BALANCE SERVICES
# ==========================================

def get_or_create_leave_balance(
    db: Session,
    employee_id: int,
    leave_type_id: int,
    year: int,
    lock: bool = False,
) -> LeaveBalance:
    """
    Get existing LeaveBalance or initialize using LeaveType.annual_allocation.
    Row locking applied when lock=True.
    """
    stmt = select(LeaveBalance).where(
        LeaveBalance.employee_id == employee_id,
        LeaveBalance.leave_type_id == leave_type_id,
        LeaveBalance.year == year,
    )
    if lock:
        stmt = stmt.with_for_update()

    balance = db.scalar(stmt)
    if not balance:
        leave_type = db.get(LeaveType, leave_type_id)
        allocation = leave_type.annual_allocation if leave_type else Decimal("0.00")
        balance = LeaveBalance(
            employee_id=employee_id,
            leave_type_id=leave_type_id,
            year=year,
            allocated_days=allocation,
            used_days=Decimal("0.00"),
            pending_days=Decimal("0.00"),
        )
        db.add(balance)
        db.commit()
        db.refresh(balance)
    return balance


def get_employee_balances(
    db: Session,
    employee_id: int,
    year: Optional[int] = None,
) -> List[LeaveBalanceResponse]:
    if year is None:
        year = date.today().year

    # Ensure balances exist for all active leave types for this year
    active_types = get_active_leave_types(db)
    for lt in active_types:
        get_or_create_leave_balance(db, employee_id, lt.id, year)

    balances = list(
        db.scalars(
            select(LeaveBalance)
            .where(
                LeaveBalance.employee_id == employee_id,
                LeaveBalance.year == year,
            )
            .order_by(LeaveBalance.leave_type_id)
        ).all()
    )

    res = []
    for b in balances:
        rem = b.allocated_days - b.used_days - b.pending_days
        res.append(
            LeaveBalanceResponse(
                id=b.id,
                employee_id=b.employee_id,
                leave_type_id=b.leave_type_id,
                leave_type_name=b.leave_type.name if b.leave_type else "Leave",
                year=b.year,
                allocated_days=b.allocated_days,
                used_days=b.used_days,
                pending_days=b.pending_days,
                remaining_days=max(Decimal("0.00"), rem),
                created_at=b.created_at,
                updated_at=b.updated_at,
            )
        )
    return res


def update_employee_balance(
    db: Session,
    employee_id: int,
    leave_type_id: int,
    balance_in: LeaveBalanceUpdate,
    year: int,
    current_user: User,
    ip_address: Optional[str] = None,
) -> LeaveBalanceResponse:
    employee = db.get(Employee, employee_id)
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found.",
        )

    leave_type = db.get(LeaveType, leave_type_id)
    if not leave_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave type not found.",
        )

    balance = get_or_create_leave_balance(db, employee_id, leave_type_id, year, lock=True)
    balance.allocated_days = balance_in.allocated_days
    if balance_in.used_days is not None:
        balance.used_days = balance_in.used_days
    if balance_in.pending_days is not None:
        balance.pending_days = balance_in.pending_days

    if balance.used_days + balance.pending_days > balance.allocated_days:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Total used and pending days cannot exceed allocated days.",
        )

    db.commit()

    create_audit_log(
        db=db,
        action=AuditAction.LEAVE_BALANCE_UPDATED,
        user_id=current_user.id,
        ip_address=ip_address,
    )

    rem = balance.allocated_days - balance.used_days - balance.pending_days
    return LeaveBalanceResponse(
        id=balance.id,
        employee_id=balance.employee_id,
        leave_type_id=balance.leave_type_id,
        leave_type_name=leave_type.name,
        year=balance.year,
        allocated_days=balance.allocated_days,
        used_days=balance.used_days,
        pending_days=balance.pending_days,
        remaining_days=max(Decimal("0.00"), rem),
        created_at=balance.created_at,
        updated_at=balance.updated_at,
    )


# ==========================================
# LEAVE REQUEST SERVICES
# ==========================================

def get_employee_record_by_user(db: Session, user: User) -> Employee:
    """
    Validate employee eligibility:
    - Must exist
    - deleted_at IS NULL
    - employment_status == ACTIVE
    - user is_active == True
    """
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user accounts cannot apply for leave.",
        )

    stmt = select(Employee).where(
        Employee.user_id == user.id,
        Employee.deleted_at == None,
    )
    employee = db.scalar(stmt)
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee profile not found.",
        )

    if employee.employment_status != EmploymentStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Employees with status '{employee.employment_status.value}' are not eligible to apply for leave.",
        )

    return employee


def apply_leave(
    db: Session,
    req_in: LeaveRequestCreate,
    current_user: User,
    document: Optional[UploadFile] = None,
    ip_address: Optional[str] = None,
) -> LeaveRequestResponse:
    employee = get_employee_record_by_user(db, current_user)

    # Validate Leave Type
    leave_type = db.get(LeaveType, req_in.leave_type_id)
    if not leave_type or not leave_type.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selected leave type is invalid or inactive.",
        )

    # Date validations
    today = date.today()
    if req_in.start_date < today:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Past leave dates are not allowed.",
        )

    if req_in.start_date.year != req_in.end_date.year:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cross-year leave requests are not allowed.",
        )

    # Calculate duration
    duration = compute_leave_duration(
        req_in.start_date,
        req_in.end_date,
        req_in.start_day_type,
        req_in.end_day_type,
    )

    # Document check
    if leave_type.requires_document and not document:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Supporting document is required for {leave_type.name}.",
        )

    # Overlap check (PENDING or APPROVED)
    overlap_stmt = select(LeaveRequest).where(
        LeaveRequest.employee_id == employee.id,
        LeaveRequest.status.in_([LeaveStatus.PENDING, LeaveStatus.APPROVED]),
        LeaveRequest.start_date <= req_in.end_date,
        LeaveRequest.end_date >= req_in.start_date,
    )
    if db.scalar(overlap_stmt):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have a pending or approved leave request overlapping with these dates.",
        )

    # Row lock balance & check availability
    year = req_in.start_date.year
    balance = get_or_create_leave_balance(db, employee.id, leave_type.id, year, lock=True)
    remaining = balance.allocated_days - balance.used_days - balance.pending_days

    if remaining < duration:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient leave balance. Remaining: {remaining} day(s), Requested: {duration} day(s).",
        )

    # Deduct pending balance
    balance.pending_days += duration

    # Create LeaveRequest
    leave_req = LeaveRequest(
        employee_id=employee.id,
        leave_type_id=leave_type.id,
        start_date=req_in.start_date,
        end_date=req_in.end_date,
        duration=duration,
        start_day_type=req_in.start_day_type,
        end_day_type=req_in.end_day_type,
        reason=req_in.reason,
        status=LeaveStatus.PENDING,
    )
    db.add(leave_req)
    db.commit()
    db.refresh(leave_req)

    # Upload document if provided
    attachments = []
    if document:
        # Save attachment details (mock or local storage if Cloudinary credentials missing)
        file_bytes = document.file.read()
        attachment = LeaveAttachment(
            leave_request_id=leave_req.id,
            file_url=f"/uploads/{document.filename}",
            public_id=f"leave_{leave_req.id}_{document.filename}",
            original_filename=document.filename or "attachment",
            content_type=document.content_type or "application/octet-stream",
            file_size=len(file_bytes),
        )
        db.add(attachment)
        db.flush()
        attachments.append(attachment)

    # Audit log
    create_audit_log(
        db=db,
        action=AuditAction.LEAVE_APPLIED,
        user_id=current_user.id,
        ip_address=ip_address,
    )

    # Notify HR in-app
    notify_all_hr(
        db=db,
        title="New Leave Request",
        message=f"{employee.first_name} {employee.last_name} applied for {leave_type.name} ({duration} day(s)).",
        notification_type=NotificationType.LEAVE_REQUEST,
        reference_id=str(leave_req.id),
        reference_type="LEAVE",
    )

    # Notify HR via Email
    hr_users = db.scalars(
        select(User).where(User.role == UserRole.HR, User.is_active == True)
    ).all()
    seen_hr_emails = set()
    emp_full_name = f"{employee.first_name} {employee.last_name}".strip()

    for hr_u in hr_users:
        if hr_u.email and hr_u.email not in seen_hr_emails:
            seen_hr_emails.add(hr_u.email)
            try:
                send_leave_request_email(
                    recipient_email=hr_u.email,
                    employee_name=emp_full_name,
                    leave_type=leave_type.name,
                    start_date=str(leave_req.start_date),
                    end_date=str(leave_req.end_date),
                    duration=str(duration),
                    reason=req_in.reason,
                    login_url=settings.FRONTEND_URL,
                )
            except Exception as e:
                logger.error(
                    f"Failed to send leave request email to HR {hr_u.email}: {e}"
                )

    return build_leave_response(leave_req)


def cancel_leave(
    db: Session,
    leave_id: int,
    cancel_in: Optional[Union[LeaveCancelRequest, User, str]] = None,
    current_user: Optional[User] = None,
    ip_address: Optional[str] = None,
) -> LeaveRequestResponse:
    if isinstance(cancel_in, User):
        current_user = cancel_in
        cancel_in = LeaveCancelRequest(cancellation_reason="Cancelled by employee")
    elif isinstance(cancel_in, str):
        cancel_in = LeaveCancelRequest(cancellation_reason=cancel_in)
    elif cancel_in is None:
        cancel_in = LeaveCancelRequest(cancellation_reason="Cancelled by employee")

    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    employee = get_employee_record_by_user(db, current_user)

    # Fetch LeaveRequest with row-level write lock inside transaction
    leave_req = db.scalar(
        select(LeaveRequest).where(LeaveRequest.id == leave_id).with_for_update()
    )

    if not leave_req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave request not found.",
        )

    # IDOR protection
    if leave_req.employee_id != employee.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only cancel your own leave requests.",
        )

    # Re-check status inside the transaction to prevent race conditions & duplicate balance restoration
    if leave_req.status not in (LeaveStatus.PENDING, LeaveStatus.APPROVED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only PENDING or APPROVED leave requests can be cancelled. Current status: {leave_req.status.value}",
        )

    previous_status = leave_req.status

    # Row lock balance & restore days exactly once based on status
    balance = get_or_create_leave_balance(
        db, employee.id, leave_req.leave_type_id, leave_req.start_date.year, lock=True
    )

    if previous_status == LeaveStatus.PENDING:
        balance.pending_days = max(Decimal("0.00"), balance.pending_days - leave_req.duration)
    elif previous_status == LeaveStatus.APPROVED:
        balance.used_days = max(Decimal("0.00"), balance.used_days - leave_req.duration)

    leave_req.status = LeaveStatus.CANCELLED
    leave_req.cancellation_reason = cancel_in.cancellation_reason
    leave_req.cancelled_by = current_user.id
    leave_req.cancelled_at = datetime.now(timezone.utc)

    # Audit log
    create_audit_log(
        db=db,
        action=AuditAction.LEAVE_CANCELLED,
        user_id=current_user.id,
        ip_address=ip_address,
    )

    db.commit()
    db.refresh(leave_req)

    # Notify HR in-app
    notify_all_hr(
        db=db,
        title="Leave Request Cancelled",
        message=f"{employee.first_name} {employee.last_name} cancelled their {previous_status.value.lower()} leave request ({leave_req.leave_type.name}). Reason: {cancel_in.cancellation_reason}",
        notification_type=NotificationType.LEAVE_CANCELLED,
        reference_id=str(leave_req.id),
        reference_type="LEAVE",
    )

    return build_leave_response(leave_req)


def revoke_leave_decision(
    db: Session,
    leave_id: int,
    revoke_in: LeaveRevokeRequest,
    current_hr: User,
    ip_address: Optional[str] = None,
) -> LeaveRequestResponse:
    # Fetch LeaveRequest with row-level write lock inside transaction
    leave_req = db.scalar(
        select(LeaveRequest).where(LeaveRequest.id == leave_id).with_for_update()
    )

    if not leave_req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave request not found.",
        )

    # Re-check status inside transaction to prevent race conditions & duplicate balance restoration
    if leave_req.status not in (LeaveStatus.APPROVED, LeaveStatus.REJECTED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only APPROVED or REJECTED leave requests can be revoked. Current status: {leave_req.status.value}",
        )

    previous_status = leave_req.status

    # Row lock balance: if previous status was APPROVED, restore used_days exactly once
    if previous_status == LeaveStatus.APPROVED:
        balance = get_or_create_leave_balance(
            db, leave_req.employee_id, leave_req.leave_type_id, leave_req.start_date.year, lock=True
        )
        balance.used_days = max(Decimal("0.00"), balance.used_days - leave_req.duration)

    leave_req.status = LeaveStatus.REVOKED
    leave_req.revocation_reason = revoke_in.revocation_reason
    leave_req.revoked_by = current_hr.id
    leave_req.revoked_at = datetime.now(timezone.utc)

    # Audit log
    create_audit_log(
        db=db,
        action=AuditAction.LEAVE_REVOKED,
        user_id=current_hr.id,
        ip_address=ip_address,
    )

    db.commit()
    db.refresh(leave_req)

    # Notify employee in-app
    if leave_req.employee:
        create_notification(
            db=db,
            user_id=leave_req.employee.user_id,
            title="Leave Decision Revoked",
            message=f"HR revoked the decision on your {leave_req.leave_type.name} leave request. Reason: {revoke_in.revocation_reason}",
            notification_type=NotificationType.LEAVE_CANCELLED,
            reference_id=str(leave_req.id),
            reference_type="LEAVE",
        )

    return build_leave_response(leave_req)


def approve_leave(
    db: Session,
    leave_id: int,
    review_in: LeaveRequestReview,
    current_user: User,
    ip_address: Optional[str] = None,
) -> LeaveRequestResponse:
    leave_req = db.get(LeaveRequest, leave_id)
    if not leave_req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave request not found.",
        )

    if leave_req.status != LeaveStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only PENDING leave requests can be approved. Current status: {leave_req.status.value}",
        )

    # Row lock balance: move pending_days -> used_days
    balance = get_or_create_leave_balance(db, leave_req.employee_id, leave_req.leave_type_id, leave_req.start_date.year, lock=True)
    balance.pending_days = max(Decimal("0.00"), balance.pending_days - leave_req.duration)
    balance.used_days += leave_req.duration

    leave_req.status = LeaveStatus.APPROVED
    leave_req.hr_remarks = review_in.hr_remarks
    leave_req.reviewed_by = current_user.id
    leave_req.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(leave_req)

    create_audit_log(
        db=db,
        action=AuditAction.LEAVE_APPROVED,
        user_id=current_user.id,
        ip_address=ip_address,
    )

    # Notify employee in-app
    create_notification(
        db=db,
        user_id=leave_req.employee.user_id,
        title="Leave Request Approved",
        message=f"Your leave request for {leave_req.leave_type.name} ({leave_req.start_date} to {leave_req.end_date}) has been approved.",
        notification_type=NotificationType.LEAVE_APPROVED,
        reference_id=str(leave_req.id),
        reference_type="LEAVE",
    )

    # Notify employee via Email
    if leave_req.employee and leave_req.employee.user and leave_req.employee.user.email and leave_req.employee.user.is_active:
        try:
            emp_name = f"{leave_req.employee.first_name} {leave_req.employee.last_name}".strip()
            send_leave_approved_email(
                recipient_email=leave_req.employee.user.email,
                employee_name=emp_name,
                leave_type=leave_req.leave_type.name if leave_req.leave_type else "Leave",
                start_date=str(leave_req.start_date),
                end_date=str(leave_req.end_date),
                duration=str(leave_req.duration),
                hr_remarks=review_in.hr_remarks,
                login_url=settings.FRONTEND_URL,
            )
        except Exception as e:
            logger.error(
                f"Failed to send leave approved email to {leave_req.employee.user.email}: {e}"
            )

    return build_leave_response(leave_req)


def reject_leave(
    db: Session,
    leave_id: int,
    review_in: LeaveRequestReview,
    current_user: User,
    ip_address: Optional[str] = None,
) -> LeaveRequestResponse:
    leave_req = db.get(LeaveRequest, leave_id)
    if not leave_req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave request not found.",
        )

    if leave_req.status != LeaveStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only PENDING leave requests can be rejected. Current status: {leave_req.status.value}",
        )

    # Row lock balance: restore pending_days
    balance = get_or_create_leave_balance(db, leave_req.employee_id, leave_req.leave_type_id, leave_req.start_date.year, lock=True)
    balance.pending_days = max(Decimal("0.00"), balance.pending_days - leave_req.duration)

    leave_req.status = LeaveStatus.REJECTED
    leave_req.hr_remarks = review_in.hr_remarks
    leave_req.reviewed_by = current_user.id
    leave_req.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(leave_req)

    create_audit_log(
        db=db,
        action=AuditAction.LEAVE_REJECTED,
        user_id=current_user.id,
        ip_address=ip_address,
    )

    # Notify employee in-app
    create_notification(
        db=db,
        user_id=leave_req.employee.user_id,
        title="Leave Request Rejected",
        message=f"Your leave request for {leave_req.leave_type.name} has been rejected. Remarks: {review_in.hr_remarks or 'None'}",
        notification_type=NotificationType.LEAVE_REJECTED,
        reference_id=str(leave_req.id),
        reference_type="LEAVE",
    )

    # Notify employee via Email
    if leave_req.employee and leave_req.employee.user and leave_req.employee.user.email and leave_req.employee.user.is_active:
        try:
            emp_name = f"{leave_req.employee.first_name} {leave_req.employee.last_name}".strip()
            send_leave_rejected_email(
                recipient_email=leave_req.employee.user.email,
                employee_name=emp_name,
                leave_type=leave_req.leave_type.name if leave_req.leave_type else "Leave",
                start_date=str(leave_req.start_date),
                end_date=str(leave_req.end_date),
                hr_remarks=review_in.hr_remarks,
                login_url=settings.FRONTEND_URL,
            )
        except Exception as e:
            logger.error(
                f"Failed to send leave rejected email to {leave_req.employee.user.email}: {e}"
            )

    return build_leave_response(leave_req)



# ==========================================
# QUERY SERVICES
# ==========================================

def get_employee_leaves(
    db: Session,
    employee_id: int,
    page: int = 1,
    limit: int = 20,
    status_param: Optional[LeaveStatus] = None,
    year: Optional[int] = None,
) -> PaginatedLeaveResponse:
    stmt = select(LeaveRequest).where(LeaveRequest.employee_id == employee_id)

    if status_param:
        stmt = stmt.where(LeaveRequest.status == status_param)
    if year:
        stmt = stmt.where(func.extract("year", LeaveRequest.start_date) == year)

    total_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.scalar(total_stmt) or 0

    offset = (page - 1) * limit
    items_stmt = stmt.order_by(LeaveRequest.created_at.desc()).offset(offset).limit(limit)
    items = list(db.scalars(items_stmt).all())

    pages = math.ceil(total / limit) if total > 0 else 0

    return PaginatedLeaveResponse(
        items=[build_leave_response(item) for item in items],
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )


def get_all_leaves(
    db: Session,
    page: int = 1,
    limit: int = 20,
    employee_id: Optional[int] = None,
    leave_type_id: Optional[int] = None,
    status_param: Optional[LeaveStatus] = None,
    year: Optional[int] = None,
) -> PaginatedLeaveResponse:
    stmt = select(LeaveRequest)

    if employee_id:
        stmt = stmt.where(LeaveRequest.employee_id == employee_id)
    if leave_type_id:
        stmt = stmt.where(LeaveRequest.leave_type_id == leave_type_id)
    if status_param:
        stmt = stmt.where(LeaveRequest.status == status_param)
    if year:
        stmt = stmt.where(func.extract("year", LeaveRequest.start_date) == year)

    total_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.scalar(total_stmt) or 0

    offset = (page - 1) * limit
    items_stmt = stmt.order_by(LeaveRequest.created_at.desc()).offset(offset).limit(limit)
    items = list(db.scalars(items_stmt).all())

    pages = math.ceil(total / limit) if total > 0 else 0

    return PaginatedLeaveResponse(
        items=[build_leave_response(item) for item in items],
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )


def get_leave_details(db: Session, leave_id: int, current_user: User) -> LeaveRequestResponse:
    leave_req = db.get(LeaveRequest, leave_id)
    if not leave_req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave request not found.",
        )

    # IDOR Check for Employee
    if current_user.role == UserRole.EMPLOYEE:
        employee = get_employee_record_by_user(db, current_user)
        if leave_req.employee_id != employee.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this leave request.",
            )

    return build_leave_response(leave_req)


def build_leave_response(leave_req: LeaveRequest) -> LeaveRequestResponse:
    emp = leave_req.employee
    emp_name = f"{emp.first_name} {emp.last_name}" if emp else "Unknown"
    emp_code = emp.employee_code if emp else ""
    lt_name = leave_req.leave_type.name if leave_req.leave_type else "Leave"

    return LeaveRequestResponse(
        id=leave_req.id,
        employee_id=leave_req.employee_id,
        employee_name=emp_name,
        employee_code=emp_code,
        leave_type_id=leave_req.leave_type_id,
        leave_type_name=lt_name,
        start_date=leave_req.start_date,
        end_date=leave_req.end_date,
        duration=leave_req.duration,
        start_day_type=leave_req.start_day_type,
        end_day_type=leave_req.end_day_type,
        reason=leave_req.reason,
        status=leave_req.status,
        hr_remarks=leave_req.hr_remarks,
        reviewed_by=leave_req.reviewed_by,
        reviewed_at=leave_req.reviewed_at,
        cancellation_reason=leave_req.cancellation_reason,
        cancelled_by=leave_req.cancelled_by,
        cancelled_at=leave_req.cancelled_at,
        revocation_reason=leave_req.revocation_reason,
        revoked_by=leave_req.revoked_by,
        revoked_at=leave_req.revoked_at,
        created_at=leave_req.created_at,
        updated_at=leave_req.updated_at,
        attachments=leave_req.attachments or [],
    )
