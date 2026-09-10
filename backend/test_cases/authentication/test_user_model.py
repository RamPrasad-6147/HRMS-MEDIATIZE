from app.authentication_service.models import (
    EmailOTP,
    EmailOTPPurpose,
    User,
    UserRole,
)


def test_user_table_name():
    assert User.__tablename__ == "users"


def test_user_has_passwordless_columns():
    columns = User.__table__.columns

    expected_columns = {
        "id",
        "email",
        "employee_id",
        "role",
        "is_active",
        "created_at",
        "updated_at",
        "last_login_at",
    }

    assert set(columns.keys()) == expected_columns


def test_password_columns_are_removed():
    columns = User.__table__.columns

    assert "password_hash" not in columns
    assert "must_change_password" not in columns


def test_user_role_values():
    assert UserRole.HR.value == "HR"
    assert UserRole.EMPLOYEE.value == "EMPLOYEE"


def test_email_otp_table_name():
    assert EmailOTP.__tablename__ == "email_otps"


def test_email_otp_purposes():
    assert EmailOTPPurpose.LOGIN.value == "LOGIN"
    assert (
        EmailOTPPurpose.EMAIL_CHANGE.value
        == "EMAIL_CHANGE"
    )


def test_email_otp_columns():
    columns = EmailOTP.__table__.columns

    expected_columns = {
        "id",
        "user_id",
        "purpose",
        "otp_hash",
        "expires_at",
        "used_at",
        "attempt_count",
        "created_at",
        "requested_ip",
        "target_email",
    }

    assert set(columns.keys()) == expected_columns