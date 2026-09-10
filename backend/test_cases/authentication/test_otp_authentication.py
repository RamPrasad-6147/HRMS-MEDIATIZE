import secrets
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from fastapi import HTTPException, status
from sqlalchemy import select

from app.authentication_service.models import (
    EmailOTP,
    EmailOTPPurpose,
    User,
    UserRole,
)
from app.authentication_service.schemas import (
    OTPRequestResponse,
    OTPVerifySchema,
)
from app.authentication_service.service import (
    check_user_eligibility,
    hash_otp,
    request_otp,
    verify_otp,
)
from app.audit_service.models import AuditAction, AuditLog
from app.core.config import settings
from app.employee_service.models import Employee, EmploymentStatus


@pytest.fixture
def create_test_hr_user(db_session):
    user = User(
        email="test_hr_otp@example.com",
        role=UserRole.HR,
        is_active=True,
    )

    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    return user


@pytest.fixture
def create_test_emp_user(db_session):
    user = User(
        email="test_emp_otp@example.com",
        role=UserRole.EMPLOYEE,
        is_active=True,
    )

    db_session.add(user)
    db_session.flush()

    employee = Employee(
        user_id=user.id,
        employee_code="EMP_OTP_001",
        first_name="Test",
        last_name="Employee",
        employment_status=EmploymentStatus.ACTIVE,
    )

    db_session.add(employee)
    db_session.commit()
    db_session.refresh(user)

    return user


def test_otp_request_success(
    db_session,
    create_test_hr_user,
):
    user = create_test_hr_user

    with patch(
        "app.authentication_service.service.send_otp_email"
    ):
        response = request_otp(
            db_session,
            user.email,
            "127.0.0.1",
        )

    assert isinstance(
        response,
        OTPRequestResponse,
    )

    assert (
        response.expires_in_seconds
        == settings.OTP_EXPIRE_MINUTES * 60
    )


def test_otp_format_validation():
    schema = OTPVerifySchema(
        email="user@example.com",
        otp="019284",
    )

    assert schema.otp == "019284"

    with pytest.raises(ValueError):
        OTPVerifySchema(
            email="user@example.com",
            otp="12345",
        )

    with pytest.raises(ValueError):
        OTPVerifySchema(
            email="user@example.com",
            otp="1234567",
        )

    with pytest.raises(ValueError):
        OTPVerifySchema(
            email="user@example.com",
            otp="12a456",
        )


def test_otp_is_never_returned(
    db_session,
    create_test_hr_user,
):
    user = create_test_hr_user

    with patch(
        "app.authentication_service.service.send_otp_email"
    ):
        response = request_otp(
            db_session,
            user.email,
        )

    data = response.model_dump()

    assert "otp" not in data
    assert "otp_code" not in data


def test_otp_is_hmac_hashed(
    db_session,
    create_test_hr_user,
):
    user = create_test_hr_user

    with patch(
        "app.authentication_service.service.send_otp_email"
    ):
        request_otp(
            db_session,
            user.email,
        )

    otp_record = db_session.scalar(
        select(EmailOTP)
        .where(
            EmailOTP.user_id == user.id,
            EmailOTP.purpose
            == EmailOTPPurpose.LOGIN,
        )
    )

    assert otp_record is not None
    assert len(otp_record.otp_hash) == 64
    assert otp_record.otp_hash != "123456"


def test_constant_time_comparison():
    first = hash_otp("019284")
    second = hash_otp("019284")
    third = hash_otp("019285")

    assert secrets.compare_digest(
        first,
        second,
    )

    assert not secrets.compare_digest(
        first,
        third,
    )


def test_expired_otp_is_rejected(
    db_session,
    create_test_hr_user,
):
    user = create_test_hr_user

    with patch(
        "app.authentication_service.service.send_otp_email"
    ):
        request_otp(
            db_session,
            user.email,
        )

    otp_record = db_session.scalar(
        select(EmailOTP)
        .where(
            EmailOTP.user_id == user.id,
            EmailOTP.purpose
            == EmailOTPPurpose.LOGIN,
        )
    )

    otp_record.expires_at = (
        datetime.now(timezone.utc)
        - timedelta(minutes=1)
    )

    db_session.commit()

    with pytest.raises(HTTPException) as exc:
        verify_otp(
            db_session,
            user.email,
            "000000",
        )

    assert (
        exc.value.status_code
        == status.HTTP_400_BAD_REQUEST
    )

    assert "expired" in (
        exc.value.detail.lower()
    )


def test_max_attempts_lockout(
    db_session,
    create_test_hr_user,
):
    user = create_test_hr_user

    with patch(
        "app.authentication_service.service.send_otp_email"
    ):
        with patch(
            "app.authentication_service.service.secrets.choice",
            side_effect=list("123456"),
        ):
            request_otp(
                db_session,
                user.email,
            )

    for _ in range(
        settings.OTP_MAX_ATTEMPTS - 1
    ):
        with pytest.raises(HTTPException):
            verify_otp(
                db_session,
                user.email,
                "999999",
            )

    otp_record = db_session.scalar(
        select(EmailOTP)
        .where(
            EmailOTP.user_id == user.id,
            EmailOTP.purpose
            == EmailOTPPurpose.LOGIN,
        )
    )

    assert (
        otp_record.attempt_count
        == settings.OTP_MAX_ATTEMPTS - 1
    )

    with pytest.raises(HTTPException):
        verify_otp(
            db_session,
            user.email,
            "999999",
        )

    db_session.refresh(otp_record)

    assert (
        otp_record.attempt_count
        == settings.OTP_MAX_ATTEMPTS
    )

    assert (
        otp_record.expires_at
        <= datetime.now(timezone.utc)
    )


def test_correct_otp_can_be_used_once(
    db_session,
    create_test_hr_user,
):
    user = create_test_hr_user

    with patch(
        "app.authentication_service.service.send_otp_email"
    ):
        with patch(
            "app.authentication_service.service.secrets.choice",
            side_effect=list("019284"),
        ):
            request_otp(
                db_session,
                user.email,
            )

    token = verify_otp(
        db_session,
        user.email,
        "019284",
    )

    assert token

    otp_record = db_session.scalar(
        select(EmailOTP)
        .where(
            EmailOTP.user_id == user.id,
            EmailOTP.purpose
            == EmailOTPPurpose.LOGIN,
        )
    )

    assert otp_record.used_at is not None

    with pytest.raises(HTTPException):
        verify_otp(
            db_session,
            user.email,
            "019284",
        )


def test_new_otp_invalidates_previous(
    db_session,
    create_test_hr_user,
):
    user = create_test_hr_user

    with patch(
        "app.authentication_service.service.send_otp_email"
    ):
        with patch(
            "app.authentication_service.service.secrets.choice",
            side_effect=list("111111"),
        ):
            request_otp(
                db_session,
                user.email,
            )

    first = db_session.scalar(
        select(EmailOTP)
        .where(
            EmailOTP.user_id == user.id,
            EmailOTP.purpose
            == EmailOTPPurpose.LOGIN,
        )
        .order_by(
            EmailOTP.created_at.desc()
        )
    )

    first.created_at = (
        datetime.now(timezone.utc)
        - timedelta(seconds=65)
    )

    db_session.commit()

    with patch(
        "app.authentication_service.service.send_otp_email"
    ):
        with patch(
            "app.authentication_service.service.secrets.choice",
            side_effect=list("222222"),
        ):
            request_otp(
                db_session,
                user.email,
            )

    with pytest.raises(HTTPException):
        verify_otp(
            db_session,
            user.email,
            "111111",
        )

    token = verify_otp(
        db_session,
        user.email,
        "222222",
    )

    assert token


def test_otp_request_cooldown(
    db_session,
    create_test_hr_user,
):
    user = create_test_hr_user

    with patch(
        "app.authentication_service.service.send_otp_email"
    ):
        request_otp(
            db_session,
            user.email,
        )

    with pytest.raises(HTTPException) as exc:
        request_otp(
            db_session,
            user.email,
        )

    assert (
        exc.value.status_code
        == status.HTTP_429_TOO_MANY_REQUESTS
    )


def test_otp_window_rate_limit(
    db_session,
    create_test_hr_user,
):
    user = create_test_hr_user
    now = datetime.now(timezone.utc)

    for i in range(
        settings.OTP_MAX_REQUESTS_PER_WINDOW
    ):
        record = EmailOTP(
            user_id=user.id,
            purpose=EmailOTPPurpose.LOGIN,
            otp_hash="dummy_hash",
            expires_at=(
                now + timedelta(minutes=10)
            ),
            created_at=(
                now - timedelta(minutes=i + 1)
            ),
        )

        db_session.add(record)

    db_session.commit()

    with pytest.raises(HTTPException) as exc:
        request_otp(
            db_session,
            user.email,
        )

    assert (
        exc.value.status_code
        == status.HTTP_429_TOO_MANY_REQUESTS
    )


def test_unknown_email_gets_generic_response(
    db_session,
):
    with pytest.raises(HTTPException) as exc:
        request_otp(
            db_session,
            "nonexistent@example.com",
        )

    assert exc.value.status_code == status.HTTP_400_BAD_REQUEST
    assert "Email does not exist" in exc.value.detail



def test_ineligible_employee_cannot_authenticate(
    db_session,
    create_test_emp_user,
):
    user = create_test_emp_user

    assert check_user_eligibility(
        db_session,
        user,
    )

    user.is_active = False
    db_session.commit()

    assert not check_user_eligibility(
        db_session,
        user,
    )

    user.is_active = True

    employee = db_session.scalar(
        select(Employee)
        .where(
            Employee.user_id == user.id
        )
    )

    employee.employment_status = (
        EmploymentStatus.INACTIVE
    )

    db_session.commit()

    assert not check_user_eligibility(
        db_session,
        user,
    )

    employee.employment_status = (
        EmploymentStatus.ACTIVE
    )

    employee.deleted_at = (
        datetime.now(timezone.utc)
    )

    db_session.commit()

    assert not check_user_eligibility(
        db_session,
        user,
    )


def test_backend_determines_role(
    db_session,
    create_test_hr_user,
    create_test_emp_user,
):
    hr_user = create_test_hr_user
    employee_user = create_test_emp_user

    with patch(
        "app.authentication_service.service.send_otp_email"
    ):
        with patch(
            "app.authentication_service.service.secrets.choice",
            side_effect=list("123456"),
        ):
            request_otp(
                db_session,
                hr_user.email,
            )

    hr_token = verify_otp(
        db_session,
        hr_user.email,
        "123456",
    )

    with patch(
        "app.authentication_service.service.send_otp_email"
    ):
        with patch(
            "app.authentication_service.service.secrets.choice",
            side_effect=list("654321"),
        ):
            request_otp(
                db_session,
                employee_user.email,
            )

    employee_token = verify_otp(
        db_session,
        employee_user.email,
        "654321",
    )

    from app.core.security import decode_access_token

    hr_payload = decode_access_token(
        hr_token
    )

    employee_payload = decode_access_token(
        employee_token
    )

    assert hr_payload["role"] == "HR"
    assert employee_payload["role"] == "EMPLOYEE"


def test_email_failure_leaves_no_usable_otp(
    db_session,
    create_test_hr_user,
):
    user = create_test_hr_user

    with patch(
        "app.authentication_service.service.send_otp_email",
        side_effect=RuntimeError(
            "SMTP connection failed"
        ),
    ):
        with pytest.raises(HTTPException) as exc:
            request_otp(
                db_session,
                user.email,
            )

    assert (
        exc.value.status_code
        == status.HTTP_503_SERVICE_UNAVAILABLE
    )

    otp_records = db_session.scalars(
        select(EmailOTP)
        .where(
            EmailOTP.user_id == user.id,
            EmailOTP.purpose
            == EmailOTPPurpose.LOGIN,
        )
    ).all()

    assert all(
        record.expires_at
        <= datetime.now(timezone.utc)
        for record in otp_records
    )


def test_otp_audit_logs(
    db_session,
    create_test_hr_user,
):
    user = create_test_hr_user

    with patch(
        "app.authentication_service.service.send_otp_email"
    ):
        with patch(
            "app.authentication_service.service.secrets.choice",
            side_effect=list("123456"),
        ):
            request_otp(
                db_session,
                user.email,
                "127.0.0.1",
            )

    logs = db_session.scalars(
        select(AuditLog)
        .where(
            AuditLog.user_id == user.id
        )
    ).all()

    assert any(
        log.action
        == AuditAction.OTP_REQUESTED
        for log in logs
    )

    verify_otp(
        db_session,
        user.email,
        "123456",
        "127.0.0.1",
    )

    logs = db_session.scalars(
        select(AuditLog)
        .where(
            AuditLog.user_id == user.id
        )
    ).all()

    assert any(
        log.action
        == AuditAction.OTP_VERIFY_SUCCESS
        for log in logs
    )


def test_raw_otp_not_in_audit_logs(
    db_session,
    create_test_hr_user,
):
    user = create_test_hr_user

    with patch(
        "app.authentication_service.service.send_otp_email"
    ):
        with patch(
            "app.authentication_service.service.secrets.choice",
            side_effect=list("019284"),
        ):
            request_otp(
                db_session,
                user.email,
            )

    logs = db_session.scalars(
        select(AuditLog)
        .where(
            AuditLog.user_id == user.id
        )
    ).all()

    for log in logs:
        assert "019284" not in str(log)