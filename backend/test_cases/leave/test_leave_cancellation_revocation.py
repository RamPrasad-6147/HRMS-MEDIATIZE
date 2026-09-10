from datetime import date, timedelta
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.authentication_service.models import User, UserRole
from app.employee_service.models import Employee, EmploymentStatus
from app.leave_service.enums import LeaveStatus
from app.leave_service.models import LeaveBalance, LeaveRequest
from app.audit_service.models import AuditAction, AuditLog
from app.core.database import SessionLocal
from app.main import app

client = TestClient(app)


@pytest.fixture
def leave_test_env(db_session):
    uid = uuid.uuid4().hex[:8]
    emp1_email = f"emp1_{uid}@example.com"
    emp2_email = f"emp2_{uid}@example.com"
    hr_email = f"hr_{uid}@example.com"

    emp1_user = User(email=emp1_email, role=UserRole.EMPLOYEE, is_active=True)
    emp2_user = User(email=emp2_email, role=UserRole.EMPLOYEE, is_active=True)
    hr_user = User(email=hr_email, role=UserRole.HR, is_active=True)
    db_session.add_all([emp1_user, emp2_user, hr_user])
    db_session.commit()

    emp1 = Employee(
        user_id=emp1_user.id,
        employee_code=f"EMP1_{uid}",
        first_name="Alice",
        last_name="Smith",
        employment_status=EmploymentStatus.ACTIVE,
    )
    emp2 = Employee(
        user_id=emp2_user.id,
        employee_code=f"EMP2_{uid}",
        first_name="Bob",
        last_name="Jones",
        employment_status=EmploymentStatus.ACTIVE,
    )
    hr_emp = Employee(
        user_id=hr_user.id,
        employee_code=f"HR_{uid}",
        first_name="Carol",
        last_name="Admin",
        employment_status=EmploymentStatus.ACTIVE,
    )
    db_session.add_all([emp1, emp2, hr_emp])
    db_session.commit()

    emp1_user.employee_id = emp1.id
    emp2_user.employee_id = emp2.id
    hr_user.employee_id = hr_emp.id
    db_session.commit()

    from app.core.security import create_access_token
    emp1_token = create_access_token(user_id=emp1_user.id, role="EMPLOYEE")
    emp2_token = create_access_token(user_id=emp2_user.id, role="EMPLOYEE")
    hr_token = create_access_token(user_id=hr_user.id, role="HR")

    return {
        "emp1_id": emp1.id,
        "emp1_user_id": emp1_user.id,
        "emp1_token": emp1_token,
        "emp2_id": emp2.id,
        "emp2_user_id": emp2_user.id,
        "emp2_token": emp2_token,
        "hr_user_id": hr_user.id,
        "hr_token": hr_token,
    }


def test_employee_cancel_pending_leave(leave_test_env, db_session):
    emp1_headers = {"Authorization": f"Bearer {leave_test_env['emp1_token']}"}
    hr_headers = {"Authorization": f"Bearer {leave_test_env['hr_token']}"}

    # 1. Create leave type
    res_lt = client.post(
        "/leave-types",
        json={"name": f"Casual_{uuid.uuid4().hex[:6]}", "annual_allocation": 10.0},
        headers=hr_headers,
    )
    lt_id = res_lt.json()["id"]

    # 2. Apply for leave (PENDING)
    start_str = (date.today() + timedelta(days=5)).isoformat()
    end_str = (date.today() + timedelta(days=6)).isoformat()
    res_apply = client.post(
        "/leaves",
        json={
            "leave_type_id": lt_id,
            "start_date": start_str,
            "end_date": end_str,
            "reason": "Family function",
        },
        headers=emp1_headers,
    )
    req_id = res_apply.json()["id"]

    # Check pending balance
    bal = db_session.query(LeaveBalance).filter_by(
        employee_id=leave_test_env["emp1_id"], leave_type_id=lt_id
    ).first()
    assert float(bal.pending_days) == 2.0

    # 3. Cancel PENDING leave
    res_cancel = client.patch(
        f"/leaves/{req_id}/cancel",
        json={"cancellation_reason": "Function postponed"},
        headers=emp1_headers,
    )
    assert res_cancel.status_code == 200
    data = res_cancel.json()
    assert data["status"] == "CANCELLED"
    assert data["cancellation_reason"] == "Function postponed"
    assert data["cancelled_by"] == leave_test_env["emp1_user_id"]
    assert data["cancelled_at"] is not None
    assert data["reason"] == "Family function"

    # Verify balance restored
    db_session.expire_all()
    bal_after = db_session.query(LeaveBalance).filter_by(
        employee_id=leave_test_env["emp1_id"], leave_type_id=lt_id
    ).first()
    assert float(bal_after.pending_days) == 0.0

    # Audit log check
    with SessionLocal() as s:
        logs = s.scalars(select(AuditLog).where(AuditLog.user_id == leave_test_env["emp1_user_id"])).all()
        log_actions = [l.action for l in logs]
        assert AuditAction.LEAVE_CANCELLED in log_actions or "LEAVE_CANCELLED" in log_actions


def test_employee_cancel_approved_leave(leave_test_env, db_session):
    emp1_headers = {"Authorization": f"Bearer {leave_test_env['emp1_token']}"}
    hr_headers = {"Authorization": f"Bearer {leave_test_env['hr_token']}"}

    # 1. Create leave type
    res_lt = client.post(
        "/leave-types",
        json={"name": f"Sick_{uuid.uuid4().hex[:6]}", "annual_allocation": 10.0},
        headers=hr_headers,
    )
    lt_id = res_lt.json()["id"]

    # 2. Apply for leave & HR approves
    start_str = (date.today() + timedelta(days=10)).isoformat()
    res_apply = client.post(
        "/leaves",
        json={
            "leave_type_id": lt_id,
            "start_date": start_str,
            "end_date": start_str,
            "reason": "Doctor appointment",
        },
        headers=emp1_headers,
    )
    req_id = res_apply.json()["id"]

    res_approve = client.patch(
        f"/leaves/{req_id}/approve",
        json={"hr_remarks": "Approved by HR"},
        headers=hr_headers,
    )
    assert res_approve.status_code == 200

    bal = db_session.query(LeaveBalance).filter_by(
        employee_id=leave_test_env["emp1_id"], leave_type_id=lt_id
    ).first()
    assert float(bal.used_days) == 1.0

    # 3. Employee cancels APPROVED leave
    res_cancel = client.patch(
        f"/leaves/{req_id}/cancel",
        json={"cancellation_reason": "Appointment cancelled by doctor"},
        headers=emp1_headers,
    )
    assert res_cancel.status_code == 200
    data = res_cancel.json()
    assert data["status"] == "CANCELLED"
    assert data["cancellation_reason"] == "Appointment cancelled by doctor"
    assert data["hr_remarks"] == "Approved by HR"
    assert data["reason"] == "Doctor appointment"

    # Verify used_days restored
    db_session.expire_all()
    bal_after = db_session.query(LeaveBalance).filter_by(
        employee_id=leave_test_env["emp1_id"], leave_type_id=lt_id
    ).first()
    assert float(bal_after.used_days) == 0.0


def test_employee_cancel_idor_and_invalid_transitions(leave_test_env):
    emp1_headers = {"Authorization": f"Bearer {leave_test_env['emp1_token']}"}
    emp2_headers = {"Authorization": f"Bearer {leave_test_env['emp2_token']}"}
    hr_headers = {"Authorization": f"Bearer {leave_test_env['hr_token']}"}

    res_lt = client.post(
        "/leave-types",
        json={"name": f"Annual_{uuid.uuid4().hex[:6]}", "annual_allocation": 10.0},
        headers=hr_headers,
    )
    lt_id = res_lt.json()["id"]

    start_str = (date.today() + timedelta(days=20)).isoformat()
    res_apply = client.post(
        "/leaves",
        json={
            "leave_type_id": lt_id,
            "start_date": start_str,
            "end_date": start_str,
            "reason": "Emp1 Leave",
        },
        headers=emp1_headers,
    )
    req_id = res_apply.json()["id"]

    # 1. Emp2 attempts to cancel Emp1's leave -> 403 Forbidden
    res_idor = client.patch(
        f"/leaves/{req_id}/cancel",
        json={"cancellation_reason": "Malicious cancel"},
        headers=emp2_headers,
    )
    assert res_idor.status_code == 403

    # 2. Reject leave as HR
    client.patch(
        f"/leaves/{req_id}/reject",
        json={"hr_remarks": "Not allowed"},
        headers=hr_headers,
    )

    # 3. Attempt to cancel REJECTED leave -> 400 Bad Request
    res_invalid = client.patch(
        f"/leaves/{req_id}/cancel",
        json={"cancellation_reason": "Wants to cancel rejected leave"},
        headers=emp1_headers,
    )
    assert res_invalid.status_code == 400


def test_hr_revoke_approved_leave(leave_test_env, db_session):
    emp1_headers = {"Authorization": f"Bearer {leave_test_env['emp1_token']}"}
    hr_headers = {"Authorization": f"Bearer {leave_test_env['hr_token']}"}

    res_lt = client.post(
        "/leave-types",
        json={"name": f"Maternity_{uuid.uuid4().hex[:6]}", "annual_allocation": 10.0},
        headers=hr_headers,
    )
    lt_id = res_lt.json()["id"]

    start_str = (date.today() + timedelta(days=30)).isoformat()
    end_str = (date.today() + timedelta(days=31)).isoformat()
    res_apply = client.post(
        "/leaves",
        json={
            "leave_type_id": lt_id,
            "start_date": start_str,
            "end_date": end_str,
            "reason": "Personal work",
        },
        headers=emp1_headers,
    )
    req_id = res_apply.json()["id"]

    client.patch(
        f"/leaves/{req_id}/approve",
        json={"hr_remarks": "Ok"},
        headers=hr_headers,
    )

    bal = db_session.query(LeaveBalance).filter_by(
        employee_id=leave_test_env["emp1_id"], leave_type_id=lt_id
    ).first()
    assert float(bal.used_days) == 2.0

    # HR revokes decision
    res_revoke = client.patch(
        f"/leaves/{req_id}/revoke",
        json={"revocation_reason": "Approved by mistake"},
        headers=hr_headers,
    )
    assert res_revoke.status_code == 200
    data = res_revoke.json()
    assert data["status"] == "REVOKED"
    assert data["revocation_reason"] == "Approved by mistake"
    assert data["revoked_by"] == leave_test_env["hr_user_id"]
    assert data["revoked_at"] is not None

    # Used days restored
    db_session.expire_all()
    bal_after = db_session.query(LeaveBalance).filter_by(
        employee_id=leave_test_env["emp1_id"], leave_type_id=lt_id
    ).first()
    assert float(bal_after.used_days) == 0.0

    # Audit log check
    with SessionLocal() as s:
        audit = s.scalar(
            select(AuditLog).where(
                AuditLog.action == AuditAction.LEAVE_REVOKED,
                AuditLog.user_id == leave_test_env["hr_user_id"],
            )
        )
        assert audit is not None


def test_hr_revoke_rejected_leave(leave_test_env, db_session):
    emp1_headers = {"Authorization": f"Bearer {leave_test_env['emp1_token']}"}
    hr_headers = {"Authorization": f"Bearer {leave_test_env['hr_token']}"}

    res_lt = client.post(
        "/leave-types",
        json={"name": f"Paternity_{uuid.uuid4().hex[:6]}", "annual_allocation": 10.0},
        headers=hr_headers,
    )
    lt_id = res_lt.json()["id"]

    start_str = (date.today() + timedelta(days=40)).isoformat()
    res_apply = client.post(
        "/leaves",
        json={
            "leave_type_id": lt_id,
            "start_date": start_str,
            "end_date": start_str,
            "reason": "Urgent leave",
        },
        headers=emp1_headers,
    )
    req_id = res_apply.json()["id"]

    client.patch(
        f"/leaves/{req_id}/reject",
        json={"hr_remarks": "Conflict with project deadline"},
        headers=hr_headers,
    )

    # HR revokes rejection decision
    res_revoke = client.patch(
        f"/leaves/{req_id}/revoke",
        json={"revocation_reason": "Deadline pushed back"},
        headers=hr_headers,
    )
    assert res_revoke.status_code == 200
    data = res_revoke.json()
    assert data["status"] == "REVOKED"
    assert data["revocation_reason"] == "Deadline pushed back"
    assert data["hr_remarks"] == "Conflict with project deadline"


def test_hr_revoke_invalid_transitions_and_auth(leave_test_env):
    emp1_headers = {"Authorization": f"Bearer {leave_test_env['emp1_token']}"}
    hr_headers = {"Authorization": f"Bearer {leave_test_env['hr_token']}"}

    res_lt = client.post(
        "/leave-types",
        json={"name": f"Study_{uuid.uuid4().hex[:6]}", "annual_allocation": 10.0},
        headers=hr_headers,
    )
    lt_id = res_lt.json()["id"]

    start_str = (date.today() + timedelta(days=50)).isoformat()
    res_apply = client.post(
        "/leaves",
        json={
            "leave_type_id": lt_id,
            "start_date": start_str,
            "end_date": start_str,
            "reason": "Exams",
        },
        headers=emp1_headers,
    )
    req_id = res_apply.json()["id"]

    # 1. Non-HR attempts to revoke -> 403 Forbidden
    res_unauth = client.patch(
        f"/leaves/{req_id}/revoke",
        json={"revocation_reason": "I am employee revoking"},
        headers=emp1_headers,
    )
    assert res_unauth.status_code == 403

    # 2. HR attempts to revoke PENDING leave -> 400 Bad Request
    res_pending = client.patch(
        f"/leaves/{req_id}/revoke",
        json={"revocation_reason": "Revoking pending"},
        headers=hr_headers,
    )
    assert res_pending.status_code == 400

    # 3. Employee cancels PENDING leave
    client.patch(
        f"/leaves/{req_id}/cancel",
        json={"cancellation_reason": "Cancelled"},
        headers=emp1_headers,
    )

    # 4. HR attempts to revoke CANCELLED leave -> 400 Bad Request
    res_cancelled = client.patch(
        f"/leaves/{req_id}/revoke",
        json={"revocation_reason": "Revoking cancelled"},
        headers=hr_headers,
    )
    assert res_cancelled.status_code == 400
