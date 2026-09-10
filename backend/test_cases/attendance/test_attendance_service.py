from datetime import datetime, timezone, timedelta
from fastapi import HTTPException
import pytest

from app.attendance_service.models import AttendanceStatus
from app.attendance_service import service
from app.authentication_service.models import User, UserRole
from app.employee_service.models import Employee, EmploymentStatus


def test_service_check_in_and_check_out(db_session):
    user = User(
        email="att_srv_user@example.com",
        role=UserRole.EMPLOYEE,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    emp = Employee(
        user_id=user.id,
        employee_code="ATTSRV01",
        first_name="Srv",
        last_name="Tester",
        employment_status=EmploymentStatus.ACTIVE,
    )
    db_session.add(emp)
    db_session.commit()

    # Check In
    res = service.check_in_employee(db_session, user, ip_address="127.0.0.1")
    assert res["employee_id"] == emp.id
    assert res["status"] == AttendanceStatus.PRESENT
    assert res["check_in"] is not None
    assert res["check_out"] is None

    # Duplicate check in -> 409 Conflict
    with pytest.raises(HTTPException) as exc_info:
        service.check_in_employee(db_session, user)
    assert exc_info.value.status_code == 409

    # Check Out
    res_out = service.check_out_employee(db_session, user, ip_address="127.0.0.1")
    assert res_out["check_out"] is not None
    assert res_out["working_minutes"] is not None

    # Duplicate check out -> 409 Conflict
    with pytest.raises(HTTPException) as exc_info:
        service.check_out_employee(db_session, user)
    assert exc_info.value.status_code == 409


def test_service_check_out_without_check_in(db_session):
    user = User(
        email="att_srv_nocheckin@example.com",
        role=UserRole.EMPLOYEE,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    emp = Employee(
        user_id=user.id,
        employee_code="ATTSRV02",
        first_name="NoCheckIn",
        last_name="Tester",
        employment_status=EmploymentStatus.ACTIVE,
    )
    db_session.add(emp)
    db_session.commit()

    with pytest.raises(HTTPException) as exc_info:
        service.check_out_employee(db_session, user)
    assert exc_info.value.status_code == 404


def test_service_archived_employee_cannot_check_in(db_session):
    user = User(
        email="att_srv_archived@example.com",
        role=UserRole.EMPLOYEE,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    emp = Employee(
        user_id=user.id,
        employee_code="ATTSRV03",
        first_name="Archived",
        last_name="Tester",
        employment_status=EmploymentStatus.TERMINATED,
    )
    db_session.add(emp)
    db_session.commit()

    with pytest.raises(HTTPException) as exc_info:
        service.check_in_employee(db_session, user)
    assert exc_info.value.status_code == 400
