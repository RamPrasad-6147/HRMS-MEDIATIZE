from fastapi.testclient import TestClient
import pytest

from app.authentication_service.models import User, UserRole
from app.employee_service.models import Employee, EmploymentStatus
from app.main import app

client = TestClient(app)


@pytest.fixture
def test_setup(db_session):
    emp_user = User(
        email="emp_api_test@example.com",
        role=UserRole.EMPLOYEE,
        is_active=True,
    )
    hr_user = User(
        email="hr_api_test@example.com",
        role=UserRole.HR,
        is_active=True,
    )
    db_session.add_all([emp_user, hr_user])
    db_session.commit()

    emp = Employee(
        user_id=emp_user.id,
        employee_code="ATTAPI01",
        first_name="API",
        last_name="Employee",
        employment_status=EmploymentStatus.ACTIVE,
    )
    hr_emp = Employee(
        user_id=hr_user.id,
        employee_code="HRAMP01",
        first_name="HR",
        last_name="Admin",
        employment_status=EmploymentStatus.ACTIVE,
    )
    db_session.add_all([emp, hr_emp])
    db_session.commit()
    emp_id = emp.id
    emp_user_id = emp_user.id
    hr_user_id = hr_user.id
    db_session.expunge_all()

    # Generate tokens directly
    from app.core.security import create_access_token
    emp_token = create_access_token(user_id=emp_user_id, role="EMPLOYEE")
    hr_token = create_access_token(user_id=hr_user_id, role="HR")

    return {
        "emp_user": emp_user,
        "hr_user": hr_user,
        "emp_token": emp_token,
        "hr_token": hr_token,
        "emp_id": emp_id,
    }


def test_employee_check_in_and_out_api(test_setup):
    headers = {"Authorization": f"Bearer {test_setup['emp_token']}"}

    # GET today before check-in
    res_today = client.get("/attendance/me/today", headers=headers)
    assert res_today.status_code == 200
    assert res_today.json()["has_checked_in"] is False

    # POST check-in
    res_in = client.post("/attendance/check-in", headers=headers)
    assert res_in.status_code == 201
    data_in = res_in.json()
    assert data_in["employee_id"] == test_setup["emp_id"]
    assert data_in["check_in"] is not None

    # GET today after check-in
    res_today2 = client.get("/attendance/me/today", headers=headers)
    assert res_today2.status_code == 200
    assert res_today2.json()["has_checked_in"] is True
    assert res_today2.json()["has_checked_out"] is False

    # POST check-out
    res_out = client.post("/attendance/check-out", headers=headers)
    assert res_out.status_code == 200
    data_out = res_out.json()
    assert data_out["check_out"] is not None
    assert data_out["working_minutes"] is not None


def test_employee_attendance_history_api(test_setup):
    headers = {"Authorization": f"Bearer {test_setup['emp_token']}"}

    res = client.get("/attendance/me", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "limit" in data


def test_hr_attendance_list_and_search_api(test_setup):
    hr_headers = {"Authorization": f"Bearer {test_setup['hr_token']}"}
    emp_headers = {"Authorization": f"Bearer {test_setup['emp_token']}"}

    # Employee performs check-in first
    client.post("/attendance/check-in", headers=emp_headers)

    # HR lists all attendance
    res = client.get("/attendance", headers=hr_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 1

    # HR search
    res_search = client.get("/attendance?search=ATTAPI01", headers=hr_headers)
    assert res_search.status_code == 200
    assert res_search.json()["total"] >= 1


def test_attendance_audit_log_created(test_setup):
    emp_headers = {"Authorization": f"Bearer {test_setup['emp_token']}"}
    hr_headers = {"Authorization": f"Bearer {test_setup['hr_token']}"}

    # Employee checks in and checks out
    client.post("/attendance/check-in", headers=emp_headers)
    client.post("/attendance/check-out", headers=emp_headers)

    # HR checks audit logs
    audit_res = client.get("/audit-logs?search=ATTENDANCE", headers=hr_headers)
    assert audit_res.status_code == 200
    items = audit_res.json()["items"]
    actions = [item["action"] for item in items]
    assert "ATTENDANCE_CHECKED_IN" in actions
    assert "ATTENDANCE_CHECKED_OUT" in actions
