from datetime import date
import pytest
from pydantic import ValidationError
from app.employee_service.schemas import EmployeeCreate, EmployeeSelfUpdate, EmployeeUpdate


def test_employee_create_schema_valid():
    data = EmployeeCreate(
        first_name="Alice",
        last_name="Wonderland",
        email="alice@example.com",
        phone="9876543210",
        date_of_birth=date(1995, 5, 20),
    )
    assert data.first_name == "Alice"
    assert data.email == "alice@example.com"


def test_employee_create_schema_invalid_email():
    with pytest.raises(ValidationError):
        EmployeeCreate(
            first_name="Alice",
            last_name="Wonderland",
            email="invalid-email-address",
        )


def test_employee_self_update_schema():
    update_data = EmployeeSelfUpdate(
        phone="555-1234",
        address="123 Main Street",
    )
    assert update_data.phone == "555-1234"
    assert update_data.address == "123 Main Street"
