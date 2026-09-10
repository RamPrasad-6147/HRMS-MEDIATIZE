from datetime import date, datetime, timezone
import pytest
from sqlalchemy.exc import IntegrityError

from app.attendance_service.models import Attendance, AttendanceStatus
from app.authentication_service.models import User, UserRole
from app.employee_service.models import Employee, EmploymentStatus


def test_attendance_model_creation(db_session):
    user = User(
        email="att_model_user@example.com",
        role=UserRole.EMPLOYEE,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    emp = Employee(
        user_id=user.id,
        employee_code="ATTEMP01",
        first_name="Attendance",
        last_name="Tester",
        employment_status=EmploymentStatus.ACTIVE,
    )
    db_session.add(emp)
    db_session.commit()

    today = date.today()
    now = datetime.now(timezone.utc)
    att = Attendance(
        employee_id=emp.id,
        attendance_date=today,
        check_in=now,
        status=AttendanceStatus.PRESENT,
    )
    db_session.add(att)
    db_session.commit()

    assert att.id is not None
    assert att.employee_id == emp.id
    assert att.attendance_date == today
    assert att.check_in == now
    assert att.check_out is None
    assert att.working_minutes is None
    assert att.status == AttendanceStatus.PRESENT
    assert att.employee.employee_code == "ATTEMP01"


def test_attendance_unique_constraint(db_session):
    user = User(
        email="att_uniq_user@example.com",
        role=UserRole.EMPLOYEE,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    emp = Employee(
        user_id=user.id,
        employee_code="ATTEMP02",
        first_name="Unique",
        last_name="Tester",
        employment_status=EmploymentStatus.ACTIVE,
    )
    db_session.add(emp)
    db_session.commit()

    today = date.today()
    att1 = Attendance(
        employee_id=emp.id,
        attendance_date=today,
        check_in=datetime.now(timezone.utc),
        status=AttendanceStatus.PRESENT,
    )
    db_session.add(att1)
    db_session.commit()

    att2 = Attendance(
        employee_id=emp.id,
        attendance_date=today,
        check_in=datetime.now(timezone.utc),
        status=AttendanceStatus.PRESENT,
    )
    db_session.add(att2)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()
