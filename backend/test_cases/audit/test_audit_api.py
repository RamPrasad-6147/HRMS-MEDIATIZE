from datetime import datetime
from fastapi.testclient import TestClient

from app.authentication_service.models import User, UserRole
from app.audit_service.models import AuditAction
from app.audit_service.service import create_audit_log
from app.core.security import create_access_token
from app.main import app

client = TestClient(app)


def test_employee_accessing_audit_logs_returns_403(db_session):
    emp = User(
        email="emp_audit_test@example.com",
        role=UserRole.EMPLOYEE,
        is_active=True,
    )
    db_session.add(emp)
    db_session.commit()

    token = create_access_token(user_id=emp.id, role="EMPLOYEE")

    response = client.get(
        "/audit-logs",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "HR access required"


def test_hr_accessing_audit_logs_returns_200(db_session):
    hr = User(
        email="hr_audit_test@example.com",
        role=UserRole.HR,
        is_active=True,
    )
    db_session.add(hr)
    db_session.commit()

    create_audit_log(db_session, action=AuditAction.OTP_VERIFY_SUCCESS, user_id=hr.id, ip_address="127.0.0.1")
    db_session.commit()

    token = create_access_token(user_id=hr.id, role="HR")

    response = client.get(
        "/audit-logs",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "page" in data
    assert "limit" in data
    assert "total" in data
    assert "total_pages" in data
    assert isinstance(data["items"], list)
    assert data["total"] >= 1


def test_audit_logs_pagination_and_filtering(db_session):
    hr = User(
        email="hr_audit_filter@example.com",
        role=UserRole.HR,
        is_active=True,
    )
    db_session.add(hr)
    db_session.commit()

    log1 = create_audit_log(db_session, action=AuditAction.OTP_REQUESTED, user_id=hr.id, ip_address="192.168.1.1")
    log2 = create_audit_log(db_session, action=AuditAction.OTP_VERIFY_SUCCESS, user_id=hr.id, ip_address="192.168.1.2")
    db_session.commit()

    token = create_access_token(user_id=hr.id, role="HR")

    response = client.get(
        "/audit-logs?action=OTP_VERIFY_SUCCESS",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) >= 1
    assert all(item["action"] == "OTP_VERIFY_SUCCESS" for item in items)

    response = client.get(
        "/audit-logs?search=hr_audit_filter",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["total"] >= 2

    response = client.get(
        f"/audit-logs?user_id={hr.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["total"] >= 2


def test_audit_logs_ordering_newest_first(db_session):
    hr = User(
        email="hr_audit_order@example.com",
        role=UserRole.HR,
        is_active=True,
    )
    db_session.add(hr)
    db_session.commit()

    token = create_access_token(user_id=hr.id, role="HR")

    response = client.get(
        "/audit-logs?limit=50",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    items = response.json()["items"]
    if len(items) > 1:
        for i in range(len(items) - 1):
            t1 = datetime.fromisoformat(items[i]["created_at"])
            t2 = datetime.fromisoformat(items[i + 1]["created_at"])
            assert t1 >= t2


def test_audit_logs_immutability_no_write_endpoints(db_session):
    hr = User(
        email="hr_audit_immutable@example.com",
        role=UserRole.HR,
        is_active=True,
    )
    db_session.add(hr)
    db_session.commit()

    token = create_access_token(user_id=hr.id, role="HR")
    headers = {"Authorization": f"Bearer {token}"}

    assert client.post("/audit-logs", headers=headers, json={}).status_code in (404, 405)
    assert client.put("/audit-logs/1", headers=headers, json={}).status_code in (404, 405)
    assert client.patch("/audit-logs/1", headers=headers, json={}).status_code in (404, 405)
    assert client.delete("/audit-logs/1", headers=headers).status_code in (404, 405)


def test_audit_logs_sensitive_data_protection(db_session):
    hr = User(
        email="hr_audit_sec@example.com",
        role=UserRole.HR,
        is_active=True,
    )
    db_session.add(hr)
    db_session.commit()

    token = create_access_token(user_id=hr.id, role="HR")

    response = client.get(
        "/audit-logs",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    res_str = response.text.lower()
    for sensitive in ["password_hash", "jwt_secret", "cloudinary_api_secret", "smtp_password"]:
        assert sensitive not in res_str
