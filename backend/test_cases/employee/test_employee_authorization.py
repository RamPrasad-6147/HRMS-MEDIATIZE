from fastapi.testclient import TestClient
import pytest

from app.authentication_service.models import User, UserRole
from app.core.security import create_access_token
from app.main import app

client = TestClient(app)


def test_employee_cannot_access_hr_endpoints(db_session):
    emp_user = User(
        email="regular_employee@example.com",
        role=UserRole.EMPLOYEE,
        is_active=True,
    )
    db_session.add(emp_user)
    db_session.commit()

    token = create_access_token(user_id=emp_user.id, role="EMPLOYEE")

    # 1. Employee trying to create an employee -> 403 Forbidden
    resp = client.post(
        "/employees",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "first_name": "Hack",
            "last_name": "Attempt",
            "email": "hacker@example.com",
        },
    )
    assert resp.status_code == 403

    # 2. Employee trying to list all employees -> 403 Forbidden
    resp = client.get(
        "/employees",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403

    # 3. Employee trying to activate an employee -> 403 Forbidden
    resp = client.patch(
        "/employees/1/activate",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403


def test_unauthenticated_requests_rejected():
    resp = client.get("/employees")
    assert resp.status_code == 401

    resp = client.get("/employees/me")
    assert resp.status_code == 401
