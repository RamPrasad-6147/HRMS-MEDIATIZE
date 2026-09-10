import uuid
from unittest.mock import patch, MagicMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.authentication_service.models import (
    EmailOTP,
    EmailOTPPurpose,
    User,
    UserRole,
)
from app.authentication_service.service import hash_otp
from app.audit_service.models import AuditAction, AuditLog
from app.core.security import create_access_token
from app.employee_service.models import Employee, EmploymentStatus
from app.main import app

client = TestClient(app)


def create_user(db, email, role=UserRole.HR, is_active=True, first_name="Test", last_name="User"):
    user = User(
        email=email,
        employee_id=None,
        role=role,
        is_active=is_active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    employee = Employee(
        user_id=user.id,
        employee_code=f"EMP{user.id:04d}",
        first_name=first_name,
        last_name=last_name,
        employment_status=EmploymentStatus.ACTIVE,
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)

    user.employee_id = employee.id
    db.commit()
    db.refresh(user)
    return user


def get_auth_headers(user):
    token = create_access_token(
        user_id=user.id,
        role=user.role.value,
    )
    return {"Authorization": f"Bearer {token}"}


# 1. Request OTP for non-existent email -> 400 "Email does not exist"
def test_request_otp_unknown_email_rejected(db_session):
    response = client.post(
        "/auth/request-otp",
        json={"email": "nonexistent_user_999@example.com"},
    )
    assert response.status_code == 400
    assert "Email does not exist" in response.json()["detail"]

    # Verify no EmailOTP record created for this nonexistent email
    otps = db_session.scalars(
        select(EmailOTP).where(EmailOTP.target_email == "nonexistent_user_999@example.com")
    ).all()
    assert len(otps) == 0


# 2. Request OTP for deactivated email -> 400 "Email is deactivated"
def test_request_otp_deactivated_email_rejected(db_session):
    deact_user = create_user(db_session, "deactivated@example.com", is_active=False)

    response = client.post(
        "/auth/request-otp",
        json={"email": "deactivated@example.com"},
    )
    assert response.status_code == 400
    assert "Email is deactivated" in response.json()["detail"]


# 3. Request OTP for active user -> 200 "OTP sent successfully"
@patch("app.authentication_service.service.send_otp_email")
def test_request_otp_active_user_success(mock_send, db_session):
    user = create_user(db_session, "active_user@example.com", is_active=True)

    response = client.post(
        "/auth/request-otp",
        json={"email": "active_user@example.com"},
    )
    assert response.status_code == 200
    assert response.json()["message"] == "OTP sent successfully"
    mock_send.assert_called_once()


# 4. HR login email nameismohan123@gmail.com can request OTP
@patch("app.authentication_service.service.send_otp_email")
def test_hr_email_mohan_can_request_otp(mock_send, db_session):
    test_email = f"mohan_test_{uuid.uuid4().hex[:6]}@gmail.com"
    hr = create_user(db_session, test_email, role=UserRole.HR)

    response = client.post(
        "/auth/request-otp",
        json={"email": test_email},
    )
    assert response.status_code == 200
    assert response.json()["message"] == "OTP sent successfully"


# 5. Old HR email hr@mediatize.com returns 400 if not in database
def test_old_hr_email_returns_not_exist(db_session):
    response = client.post(
        "/auth/request-otp",
        json={"email": "hr@mediatize.com"},
    )
    assert response.status_code == 400
    assert "Email does not exist" in response.json()["detail"]


# 6. HR can retrieve profile
def test_hr_can_retrieve_profile(db_session):
    hr = create_user(db_session, "hr_profile_get@example.com", UserRole.HR)
    headers = get_auth_headers(hr)

    response = client.get("/auth/hr/profile", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == hr.id
    assert data["email"] == "hr_profile_get@example.com"
    assert data["role"] == "HR"
    assert data["first_name"] == "Test"
    assert data["last_name"] == "User"
    assert data["address"] is None
    assert data["profile_photo_url"] is None


# 7. HR can update name and optional address
def test_hr_can_update_name_and_address(db_session):
    hr = create_user(db_session, "hr_update@example.com", UserRole.HR)
    headers = get_auth_headers(hr)

    payload = {
        "first_name": "Mohan",
        "last_name": "Kumar",
        "address": "123 Mediatize Tech Street, Suite 400, Hyderabad",
    }
    response = client.put("/auth/hr/profile", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["first_name"] == "Mohan"
    assert data["last_name"] == "Kumar"
    assert data["address"] == "123 Mediatize Tech Street, Suite 400, Hyderabad"

    # Verify persistence in Employee record
    employee = db_session.scalar(select(Employee).where(Employee.user_id == hr.id))
    assert employee.first_name == "Mohan"
    assert employee.last_name == "Kumar"
    assert employee.address == "123 Mediatize Tech Street, Suite 400, Hyderabad"


# 8. HR address can be cleared (set to None or empty)
def test_hr_address_can_be_cleared(db_session):
    hr = create_user(db_session, "hr_address_clear@example.com", UserRole.HR)
    headers = get_auth_headers(hr)

    # First set address
    client.put("/auth/hr/profile", json={"first_name": "Mohan", "last_name": "K", "address": "Some Address"}, headers=headers)

    # Clear address
    response = client.put("/auth/hr/profile", json={"first_name": "Mohan", "last_name": "K", "address": None}, headers=headers)
    assert response.status_code == 200
    assert response.json()["address"] is None


# 9. Malicious attempts to alter email, role, is_active are rejected/ignored
def test_malicious_fields_in_profile_update_ignored(db_session):
    hr = create_user(db_session, "hr_secure@example.com", UserRole.HR)
    headers = get_auth_headers(hr)

    malicious_payload = {
        "first_name": "UpdatedName",
        "last_name": "UpdatedLast",
        "email": "hacked@example.com",
        "role": "ADMIN",
        "is_active": False,
        "employee_id": 9999,
    }
    response = client.put("/auth/hr/profile", json=malicious_payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "hr_secure@example.com"
    assert data["role"] == "HR"
    assert data["is_active"] is True
    assert data["first_name"] == "UpdatedName"


# 10. Employee cannot access HR profile
def test_employee_cannot_access_hr_profile(db_session):
    emp = create_user(db_session, "emp_denied@example.com", UserRole.EMPLOYEE)
    headers = get_auth_headers(emp)

    response = client.get("/auth/hr/profile", headers=headers)
    assert response.status_code == 403
    assert "HR access required" in response.json()["detail"]


# 11. Unauthenticated request rejected
def test_unauthenticated_request_rejected():
    response = client.get("/auth/hr/profile")
    assert response.status_code == 401


# 12. Inactive HR rejected
def test_inactive_hr_rejected(db_session):
    hr = create_user(db_session, "hr_inact@example.com", UserRole.HR, is_active=False)
    headers = get_auth_headers(hr)

    response = client.get("/auth/hr/profile", headers=headers)
    assert response.status_code == 403


# 13. Profile update creates audit log
def test_profile_update_creates_audit_log(db_session):
    hr = create_user(db_session, "hr_audit_update@example.com", UserRole.HR)
    headers = get_auth_headers(hr)

    client.put("/auth/hr/profile", json={"first_name": "Audit", "last_name": "Test"}, headers=headers)

    audit_log = db_session.scalar(
        select(AuditLog).where(
            AuditLog.user_id == hr.id,
            AuditLog.action == AuditAction.HR_PROFILE_UPDATED,
        )
    )
    assert audit_log is not None


# 14. Cloudinary photo upload & deletion mock tests
@patch("app.authentication_service.service.replace_image")
def test_hr_photo_upload_and_delete(mock_upload, db_session):
    mock_upload.return_value = {
        "url": "https://res.cloudinary.com/test/image/upload/v1/hr_avatar.png",
        "public_id": "hr_avatar_public_id",
    }
    hr = create_user(db_session, "hr_photo@example.com", UserRole.HR)
    headers = get_auth_headers(hr)

    # Upload photo
    files = {"file": ("avatar.png", b"fake image bytes", "image/png")}
    response = client.post("/auth/hr/profile/photo", files=files, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["profile_photo_url"] == "https://res.cloudinary.com/test/image/upload/v1/hr_avatar.png"

    # Delete photo
    with patch("app.authentication_service.service.delete_image") as mock_delete:
        del_resp = client.delete("/auth/hr/profile/photo", headers=headers)
        assert del_resp.status_code == 200
        assert del_resp.json()["profile_photo_url"] is None
        mock_delete.assert_called_once_with("hr_avatar_public_id")


# 15. Removed email-change endpoints return 404 / 405
def test_email_change_endpoints_removed(db_session):
    hr = create_user(db_session, "hr_no_change@example.com", UserRole.HR)
    headers = get_auth_headers(hr)

    req_resp = client.post(
        "/auth/hr/profile/request-email-change",
        json={"new_email": "new@example.com"},
        headers=headers,
    )
    assert req_resp.status_code in (404, 405)

    ver_resp = client.post(
        "/auth/hr/profile/verify-email-change",
        json={"new_email": "new@example.com", "otp": "123456"},
        headers=headers,
    )
    assert ver_resp.status_code in (404, 405)


# 16. Ensure HR employee record created automatically if non-existent
def test_ensure_hr_employee_record_creation(db_session):
    # Create user WITHOUT employee record
    user = User(
        email="hr_no_emp@example.com",
        role=UserRole.HR,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    headers = get_auth_headers(user)
    response = client.get("/auth/hr/profile", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "hr_no_emp@example.com"
    assert data["employee_id"] is not None


# 17. Patch profile update
def test_hr_patch_profile(db_session):
    hr = create_user(db_session, "hr_patch@example.com", UserRole.HR, first_name="Original", last_name="Name")
    headers = get_auth_headers(hr)

    response = client.patch("/auth/hr/profile", json={"first_name": "Patched"}, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["first_name"] == "Patched"
    assert data["last_name"] == "Name"


# 18. End-to-end active user login flow
@patch("app.authentication_service.service.send_otp_email")
def test_e2e_otp_login_flow(mock_send, db_session):
    user = create_user(db_session, "e2e_login@example.com", is_active=True)

    # 1. Request OTP
    res_req = client.post("/auth/request-otp", json={"email": "e2e_login@example.com"})
    assert res_req.status_code == 200

    otp_code = mock_send.call_args.kwargs["otp_code"]

    # 2. Verify OTP
    res_ver = client.post("/auth/verify-otp", json={"email": "e2e_login@example.com", "otp": otp_code})
    assert res_ver.status_code == 200
    assert "access_token" in res_ver.json()
