from datetime import date, timedelta
from decimal import Decimal

import pytest
from fastapi import HTTPException

from sqlalchemy import select
from app.audit_service.models import AuditAction, AuditLog
from typing import Tuple
import uuid
from app.authentication_service.models import User, UserRole
from app.employee_service.models import Employee, EmploymentStatus

from app.leave_service import service
from app.leave_service.enums import LeaveDayType, LeaveStatus
from app.leave_service.models import LeaveBalance, LeaveRequest, LeaveType
from app.leave_service.schemas import (
    LeaveBalanceUpdate,
    LeaveRequestCreate,
    LeaveRequestReview,
    LeaveTypeCreate,
    LeaveTypeUpdate,
)
from app.notification_service.enums import NotificationType
from app.notification_service.models import Notification

def create_test_hr(db) -> User:
    unique_id = uuid.uuid4().hex[:8]
    user = User(
        email=f"hr_leave_{unique_id}@example.com",
        role=UserRole.HR,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    emp = Employee(
        user_id=user.id,
        employee_code=f"HR_{unique_id}",
        first_name="Test",
        last_name="HR",
        employment_status=EmploymentStatus.ACTIVE,
    )
    db.add(emp)
    db.commit()
    return user


def create_test_employee(db, status=EmploymentStatus.ACTIVE, is_active=True) -> Tuple[User, Employee]:
    unique_id = uuid.uuid4().hex[:8]
    user = User(
        email=f"emp_leave_{unique_id}@example.com",
        role=UserRole.EMPLOYEE,
        is_active=is_active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    emp = Employee(
        user_id=user.id,
        employee_code=f"EMP_{unique_id}",
        first_name="Leave",
        last_name="Emp",
        employment_status=status,
    )
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return user, emp


def test_leave_type_crud(db_session):
    hr = create_test_hr(db_session)

    # 1. Create Leave Type
    lt_name = f"Casual Leave Test {uuid.uuid4().hex[:6]}"
    lt_in = LeaveTypeCreate(
        name=lt_name,
        description="For personal reasons",
        annual_allocation=Decimal("12.00"),
        is_paid=True,
        requires_document=False,
    )
    lt = service.create_leave_type(db_session, lt_in, hr)
    db_session.commit()

    assert lt.id is not None
    assert lt.name == lt_name
    assert lt.annual_allocation == Decimal("12.00")
    assert lt.is_active is True

    # 2. Duplicate name error
    with pytest.raises(HTTPException) as exc_info:
        service.create_leave_type(db_session, lt_in, hr)
    assert exc_info.value.status_code == 400

    # 3. Update Leave Type
    up_in = LeaveTypeUpdate(annual_allocation=Decimal("14.00"))
    updated_lt = service.update_leave_type(db_session, lt.id, up_in, hr)
    db_session.commit()
    assert updated_lt.annual_allocation == Decimal("14.00")

    # 4. Deactivate & Activate
    deact = service.deactivate_leave_type(db_session, lt.id, hr)
    db_session.commit()
    assert deact.is_active is False

    act = service.activate_leave_type(db_session, lt.id, hr)
    db_session.commit()
    assert act.is_active is True


def test_apply_leave_successful(db_session):
    hr = create_test_hr(db_session)
    emp_user, emp = create_test_employee(db_session)

    lt_name = f"Earned Leave Test {uuid.uuid4().hex[:6]}"
    lt = service.create_leave_type(
        db_session,
        LeaveTypeCreate(
            name=lt_name,
            annual_allocation=Decimal("10.00"),
            is_paid=True,
        ),
        hr,
    )
    db_session.commit()

    # Apply 2 days leave
    start = date.today() + timedelta(days=5)
    end = start + timedelta(days=1)
    req_in = LeaveRequestCreate(
        leave_type_id=lt.id,
        start_date=start,
        end_date=end,
        start_day_type=LeaveDayType.FULL_DAY,
        end_day_type=LeaveDayType.FULL_DAY,
        reason="Family function",
    )

    res = service.apply_leave(db_session, req_in, emp_user)
    db_session.commit()

    assert res.id is not None
    assert res.duration == Decimal("2.00")
    assert res.status == LeaveStatus.PENDING

    # Verify pending days deducted
    bal = service.get_or_create_leave_balance(db_session, emp.id, lt.id, start.year)
    assert bal.pending_days == Decimal("2.00")

    # Verify Notification created for HR
    notif = db_session.scalar(
        select(Notification).where(
            Notification.user_id == hr.id,
            Notification.notification_type == NotificationType.LEAVE_REQUEST,
        )
    )
    assert notif is not None

    # Verify Audit log created
    audit = db_session.scalar(
        select(AuditLog).where(
            AuditLog.user_id == emp_user.id,
            AuditLog.action == AuditAction.LEAVE_APPLIED,
        )
    )
    assert audit is not None


def test_past_date_and_cross_year_rejection(db_session):
    hr = create_test_hr(db_session)
    emp_user, emp = create_test_employee(db_session)

    lt_name = f"Medical Leave Test {uuid.uuid4().hex[:6]}"
    lt = service.create_leave_type(
        db_session,
        LeaveTypeCreate(name=lt_name, annual_allocation=Decimal("15.00")),
        hr,
    )
    db_session.commit()

    # 1. Past date rejection
    past_date = date.today() - timedelta(days=2)
    req_past = LeaveRequestCreate(
        leave_type_id=lt.id,
        start_date=past_date,
        end_date=past_date,
        reason="Was sick yesterday",
    )
    with pytest.raises(HTTPException) as exc_past:
        service.apply_leave(db_session, req_past, emp_user)
    assert exc_past.value.status_code == 400
    assert "Past leave dates" in exc_past.value.detail

    # 2. Cross-year rejection
    req_cross = LeaveRequestCreate(
        leave_type_id=lt.id,
        start_date=date(2026, 12, 30),
        end_date=date(2027, 1, 2),
        reason="Year end trip",
    )
    with pytest.raises(HTTPException) as exc_cross:
        service.apply_leave(db_session, req_cross, emp_user)
    assert exc_cross.value.status_code == 400
    assert "Cross-year leave" in exc_cross.value.detail


def test_half_day_leave_rules(db_session):
    hr = create_test_hr(db_session)
    emp_user, emp = create_test_employee(db_session)

    lt_name = f"Sick Leave Test {uuid.uuid4().hex[:6]}"
    lt = service.create_leave_type(
        db_session,
        LeaveTypeCreate(name=lt_name, annual_allocation=Decimal("10.00")),
        hr,
    )
    db_session.commit()

    # 1. Single-day half-day is valid
    today = date.today() + timedelta(days=2)
    req_single_half = LeaveRequestCreate(
        leave_type_id=lt.id,
        start_date=today,
        end_date=today,
        start_day_type=LeaveDayType.FIRST_HALF,
        end_day_type=LeaveDayType.FIRST_HALF,
        reason="Doctor appointment morning",
    )
    res = service.apply_leave(db_session, req_single_half, emp_user)
    db_session.commit()
    assert res.duration == Decimal("0.50")

    # 2. Multi-day with half-day is rejected
    start_multi = date.today() + timedelta(days=10)
    end_multi = start_multi + timedelta(days=2)
    req_multi_half = LeaveRequestCreate(
        leave_type_id=lt.id,
        start_date=start_multi,
        end_date=end_multi,
        start_day_type=LeaveDayType.FIRST_HALF,
        end_day_type=LeaveDayType.FULL_DAY,
        reason="Multi day trip half day start",
    )
    with pytest.raises(HTTPException) as exc_multi:
        service.apply_leave(db_session, req_multi_half, emp_user)
    assert exc_multi.value.status_code == 400
    assert "Half-day leave options are only allowed" in exc_multi.value.detail


def test_overlap_detection(db_session):
    hr = create_test_hr(db_session)
    emp_user, emp = create_test_employee(db_session)

    lt_name = f"Casual Overlap Test {uuid.uuid4().hex[:6]}"
    lt = service.create_leave_type(
        db_session,
        LeaveTypeCreate(name=lt_name, annual_allocation=Decimal("10.00")),
        hr,
    )
    db_session.commit()

    start = date.today() + timedelta(days=3)
    end = start + timedelta(days=3)

    req1 = LeaveRequestCreate(
        leave_type_id=lt.id,
        start_date=start,
        end_date=end,
        reason="First leave request",
    )
    service.apply_leave(db_session, req1, emp_user)
    db_session.commit()

    # Overlapping request
    req_overlap = LeaveRequestCreate(
        leave_type_id=lt.id,
        start_date=start + timedelta(days=1),
        end_date=end + timedelta(days=1),
        reason="Overlapping request",
    )
    with pytest.raises(HTTPException) as exc_overlap:
        service.apply_leave(db_session, req_overlap, emp_user)
    assert exc_overlap.value.status_code == 400
    assert "overlapping" in exc_overlap.value.detail


def test_leave_approve_and_reject_workflow(db_session):
    hr = create_test_hr(db_session)
    emp_user, emp = create_test_employee(db_session)

    lt_name = f"Workflow Test Leave {uuid.uuid4().hex[:6]}"
    lt = service.create_leave_type(
        db_session,
        LeaveTypeCreate(name=lt_name, annual_allocation=Decimal("10.00")),
        hr,
    )
    db_session.commit()

    # 1. Apply Leave 1
    start1 = date.today() + timedelta(days=4)
    req1 = service.apply_leave(
        db_session,
        LeaveRequestCreate(
            leave_type_id=lt.id,
            start_date=start1,
            end_date=start1,
            reason="Leave 1",
        ),
        emp_user,
    )
    db_session.commit()

    # HR Approves Leave 1
    approved = service.approve_leave(
        db_session,
        req1.id,
        LeaveRequestReview(hr_remarks="Approved by HR"),
        hr,
    )
    db_session.commit()

    assert approved.status == LeaveStatus.APPROVED
    assert approved.hr_remarks == "Approved by HR"

    # Verify used_days updated in balance
    bal = service.get_or_create_leave_balance(db_session, emp.id, lt.id, start1.year)
    assert bal.used_days == Decimal("1.00")
    assert bal.pending_days == Decimal("0.00")

    # 2. Apply Leave 2
    start2 = date.today() + timedelta(days=10)
    req2 = service.apply_leave(
        db_session,
        LeaveRequestCreate(
            leave_type_id=lt.id,
            start_date=start2,
            end_date=start2,
            reason="Leave 2",
        ),
        emp_user,
    )
    db_session.commit()

    # HR Rejects Leave 2
    rejected = service.reject_leave(
        db_session,
        req2.id,
        LeaveRequestReview(hr_remarks="Business necessity"),
        hr,
    )
    db_session.commit()

    assert rejected.status == LeaveStatus.REJECTED
    bal2 = service.get_or_create_leave_balance(db_session, emp.id, lt.id, start2.year)
    assert bal2.used_days == Decimal("1.00")
    assert bal2.pending_days == Decimal("0.00")


def test_leave_cancellation_by_employee(db_session):
    hr = create_test_hr(db_session)
    emp_user, emp = create_test_employee(db_session)

    lt_name = f"Cancel Test Leave {uuid.uuid4().hex[:6]}"
    lt = service.create_leave_type(
        db_session,
        LeaveTypeCreate(name=lt_name, annual_allocation=Decimal("10.00")),
        hr,
    )
    db_session.commit()

    start = date.today() + timedelta(days=6)
    req = service.apply_leave(
        db_session,
        LeaveRequestCreate(
            leave_type_id=lt.id,
            start_date=start,
            end_date=start,
            reason="Plan changed",
        ),
        emp_user,
    )
    db_session.commit()

    # Cancel Leave
    cancelled = service.cancel_leave(db_session, req.id, emp_user)
    db_session.commit()

    assert cancelled.status == LeaveStatus.CANCELLED
    bal = service.get_or_create_leave_balance(db_session, emp.id, lt.id, start.year)
    assert bal.pending_days == Decimal("0.00")


def test_idor_protection(db_session):
    hr = create_test_hr(db_session)
    emp1_user, emp1 = create_test_employee(db_session)
    emp2_user, emp2 = create_test_employee(db_session)

    lt_name = f"IDOR Test Leave {uuid.uuid4().hex[:6]}"
    lt = service.create_leave_type(
        db_session,
        LeaveTypeCreate(name=lt_name, annual_allocation=Decimal("10.00")),
        hr,
    )
    db_session.commit()

    start = date.today() + timedelta(days=7)
    req1 = service.apply_leave(
        db_session,
        LeaveRequestCreate(
            leave_type_id=lt.id,
            start_date=start,
            end_date=start,
            reason="Emp 1 leave",
        ),
        emp1_user,
    )
    db_session.commit()

    # Emp 2 attempts to cancel Emp 1's leave -> 403 Forbidden
    with pytest.raises(HTTPException) as exc_cancel:
        service.cancel_leave(db_session, req1.id, emp2_user)
    assert exc_cancel.value.status_code == 403

    # Emp 2 attempts to view Emp 1's leave details -> 403 Forbidden
    with pytest.raises(HTTPException) as exc_view:
        service.get_leave_details(db_session, req1.id, emp2_user)
    assert exc_view.value.status_code == 403
