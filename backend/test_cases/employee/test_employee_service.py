from unittest.mock import patch
import pytest
from fastapi import HTTPException

from app.authentication_service.models import User, UserRole
from app.employee_service.models import EmploymentStatus
from app.employee_service.schemas import EmployeeCreate, EmployeeSelfUpdate, EmployeeUpdate
from app.employee_service.service import (
    activate_employee,
    archive_employee,
    create_employee,
    deactivate_employee,
    get_employee_by_id,
    get_employee_by_user_id,
    list_employees,
    update_employee,
    update_self_profile,
)


@pytest.fixture(autouse=True)
def mock_smtp_send():
    with patch("app.employee_service.service.send_employee_welcome_email") as mock_send:
        yield mock_send


def test_create_and_retrieve_employee(db_session):
    hr = User(
        email="hr_creator@example.com",
        role=UserRole.HR,
        is_active=True,
    )
    db_session.add(hr)
    db_session.commit()

    create_data = EmployeeCreate(
        first_name="Service",
        last_name="Test",
        email="new_emp_service@example.com",
        phone="1112223333",
    )

    employee = create_employee(
        db=db_session,
        data=create_data,
        hr_user_id=hr.id,
    )

    assert employee.id is not None
    assert employee.employee_code.startswith("EMP")
    assert employee.first_name == "Service"
    assert employee.employment_status == EmploymentStatus.ACTIVE

    fetched = get_employee_by_id(db_session, employee.id)
    assert fetched.id == employee.id


def test_duplicate_email_creation_fails(db_session):
    hr = User(
        email="hr_creator2@example.com",
        role=UserRole.HR,
        is_active=True,
    )
    db_session.add(hr)
    db_session.commit()

    create_data = EmployeeCreate(
        first_name="Service1",
        last_name="Test1",
        email="duplicate@example.com",
    )
    create_employee(db=db_session, data=create_data, hr_user_id=hr.id)

    with pytest.raises(HTTPException) as exc_info:
        create_employee(db=db_session, data=create_data, hr_user_id=hr.id)
    assert exc_info.value.status_code == 409


def test_update_and_deactivate_employee(db_session):
    hr = User(
        email="hr_creator3@example.com",
        role=UserRole.HR,
        is_active=True,
    )
    db_session.add(hr)
    db_session.commit()

    employee = create_employee(
        db=db_session,
        data=EmployeeCreate(
            first_name="Before",
            last_name="Update",
            email="before_update@example.com",
        ),
        hr_user_id=hr.id,
    )

    updated = update_employee(
        db=db_session,
        employee_id=employee.id,
        data=EmployeeUpdate(first_name="After", phone="9990001111"),
    )
    assert updated.first_name == "After"
    assert updated.phone == "9990001111"

    deactivated = deactivate_employee(db_session, employee.id)
    assert deactivated.employment_status == EmploymentStatus.INACTIVE
    assert deactivated.user.is_active is False

    activated = activate_employee(db_session, employee.id)
    assert activated.employment_status == EmploymentStatus.ACTIVE
    assert activated.user.is_active is True


def test_archive_employee(db_session):
    hr = User(
        email="hr_creator4@example.com",
        role=UserRole.HR,
        is_active=True,
    )
    db_session.add(hr)
    db_session.commit()

    employee = create_employee(
        db=db_session,
        data=EmployeeCreate(
            first_name="ToArchive",
            last_name="User",
            email="to_archive@example.com",
        ),
        hr_user_id=hr.id,
    )

    archived = archive_employee(db_session, employee.id)
    assert archived.deleted_at is not None

    with pytest.raises(HTTPException) as exc_info:
        get_employee_by_id(db_session, employee.id)
    assert exc_info.value.status_code == 404
