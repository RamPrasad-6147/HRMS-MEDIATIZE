from datetime import date, timedelta
from fastapi.testclient import TestClient
import pytest

from app.authentication_service.models import User, UserRole
from app.employee_service.models import Employee, EmploymentStatus
from app.main import app

import uuid

client = TestClient(app)


@pytest.fixture
def test_setup(db_session):
    uid = uuid.uuid4().hex[:8]
    emp_email = f"emp_leave_api_{uid}@example.com"
    hr_email = f"hr_leave_api_{uid}@example.com"
    emp_code = f"LEVAPI_{uid}"
    hr_code = f"HRLEV_{uid}"

    emp_user = User(
        email=emp_email,
        role=UserRole.EMPLOYEE,
        is_active=True,
    )
    hr_user = User(
        email=hr_email,
        role=UserRole.HR,
        is_active=True,
    )
    db_session.add_all([emp_user, hr_user])
    db_session.commit()

    emp = Employee(
        user_id=emp_user.id,
        employee_code=emp_code,
        first_name="Leave",
        last_name="Tester",
        employment_status=EmploymentStatus.ACTIVE,
    )
    hr_emp = Employee(
        user_id=hr_user.id,
        employee_code=hr_code,
        first_name="HR",
        last_name="LeaveAdmin",
        employment_status=EmploymentStatus.ACTIVE,
    )
    db_session.add_all([emp, hr_emp])
    db_session.commit()
    emp_id = emp.id
    emp_user_id = emp_user.id
    hr_user_id = hr_user.id
    db_session.close()

    from app.core.security import create_access_token
    emp_token = create_access_token(user_id=emp_user_id, role="EMPLOYEE")
    hr_token = create_access_token(user_id=hr_user_id, role="HR")

    return {
        "emp_token": emp_token,
        "hr_token": hr_token,
        "emp_id": emp_id,
    }


def test_leave_type_api(test_setup):
    hr_headers = {"Authorization": f"Bearer {test_setup['hr_token']}"}
    emp_headers = {"Authorization": f"Bearer {test_setup['emp_token']}"}

    name = f"Casual Leave API {uuid.uuid4().hex[:6]}"
    # HR creates leave type
    res_create = client.post(
        "/leave-types",
        json={
            "name": name,
            "description": "API test casual leave",
            "annual_allocation": 12.0,
            "is_paid": True,
            "requires_document": False,
            "is_active": True,
        },
        headers=hr_headers,
    )
    assert res_create.status_code == 201
    lt_data = res_create.json()
    lt_id = lt_data["id"]

    # Employee views active leave types
    res_active = client.get("/leave-types", headers=emp_headers)
    assert res_active.status_code == 200
    names = [t["name"] for t in res_active.json()]
    assert name in names

    # Employee attempts to create leave type -> 403 Forbidden
    res_forbidden = client.post(
        "/leave-types",
        json={"name": "Illegal Leave", "annual_allocation": 5.0},
        headers=emp_headers,
    )
    assert res_forbidden.status_code == 403


def test_leave_application_and_approval_api(test_setup):
    hr_headers = {"Authorization": f"Bearer {test_setup['hr_token']}"}
    emp_headers = {"Authorization": f"Bearer {test_setup['emp_token']}"}

    # 1. Create leave type
    name = f"Vacation Leave API {uuid.uuid4().hex[:6]}"
    res_lt = client.post(
        "/leave-types",
        json={"name": name, "annual_allocation": 15.0},
        headers=hr_headers,
    )
    lt_id = res_lt.json()["id"]

    # 2. Employee checks balance
    res_bal = client.get("/leaves/me/balance", headers=emp_headers)
    assert res_bal.status_code == 200

    # 3. Employee applies for leave
    start = (date.today() + timedelta(days=10)).isoformat()
    end = (date.today() + timedelta(days=11)).isoformat()
    res_apply = client.post(
        "/leaves",
        json={
            "leave_type_id": lt_id,
            "start_date": start,
            "end_date": end,
            "start_day_type": "FULL_DAY",
            "end_day_type": "FULL_DAY",
            "reason": "Vacation trip",
        },
        headers=emp_headers,
    )
    assert res_apply.status_code == 201
    req_data = res_apply.json()
    req_id = req_data["id"]
    assert req_data["status"] == "PENDING"
    assert float(req_data["duration"]) == 2.0

    # 4. HR views all leave requests
    res_all = client.get("/leaves", headers=hr_headers)
    assert res_all.status_code == 200
    assert res_all.json()["total"] >= 1

    # 5. HR approves leave request
    res_approve = client.patch(
        f"/leaves/{req_id}/approve",
        json={"hr_remarks": "Approved. Enjoy your vacation!"},
        headers=hr_headers,
    )
    assert res_approve.status_code == 200
    assert res_approve.json()["status"] == "APPROVED"
    assert res_approve.json()["hr_remarks"] == "Approved. Enjoy your vacation!"


def test_leave_cancellation_api(test_setup):
    hr_headers = {"Authorization": f"Bearer {test_setup['hr_token']}"}
    emp_headers = {"Authorization": f"Bearer {test_setup['emp_token']}"}

    name = f"Emergency Leave API {uuid.uuid4().hex[:6]}"
    res_lt = client.post(
        "/leave-types",
        json={"name": name, "annual_allocation": 5.0},
        headers=hr_headers,
    )
    lt_id = res_lt.json()["id"]

    start = (date.today() + timedelta(days=15)).isoformat()
    res_apply = client.post(
        "/leaves",
        json={
            "leave_type_id": lt_id,
            "start_date": start,
            "end_date": start,
            "reason": "Personal emergency",
        },
        headers=emp_headers,
    )
    req_id = res_apply.json()["id"]

    # Employee cancels leave
    res_cancel = client.patch(
        f"/leaves/{req_id}/cancel",
        json={"cancellation_reason": "API test cancellation"},
        headers=emp_headers,
    )
    assert res_cancel.status_code == 200
    assert res_cancel.json()["status"] == "CANCELLED"
