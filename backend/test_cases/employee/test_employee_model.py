from datetime import date
import pytest
from app.authentication_service.models import User, UserRole
from app.employee_service.models import Employee, EmploymentStatus


def test_employee_model_instantiation():
    emp = Employee(
        user_id=1,
        employee_code="EMP001",
        first_name="Jane",
        last_name="Doe",
        phone="1234567890",
        employment_status=EmploymentStatus.ACTIVE,
    )
    assert emp.employee_code == "EMP001"
    assert emp.first_name == "Jane"
    assert emp.last_name == "Doe"
    assert emp.employment_status == EmploymentStatus.ACTIVE


def test_employee_db_persistence(db_session):
    user = User(
        email="employee_test_model@example.com",
        role=UserRole.EMPLOYEE,
        is_active=True,
    )
    db_session.add(user)
    db_session.flush()

    emp = Employee(
        user_id=user.id,
        employee_code="EMP999",
        first_name="John",
        last_name="Smith",
        joining_date=date(2025, 1, 15),
        employment_status=EmploymentStatus.ACTIVE,
    )
    db_session.add(emp)
    db_session.commit()

    retrieved = db_session.query(Employee).filter_by(employee_code="EMP999").first()
    assert retrieved is not None
    assert retrieved.user_id == user.id
    assert retrieved.first_name == "John"
    assert retrieved.joining_date == date(2025, 1, 15)
