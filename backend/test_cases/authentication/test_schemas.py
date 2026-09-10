import pytest
from pydantic import ValidationError

from app.authentication_service.schemas import (
    OTPRequestSchema,
    OTPVerifySchema,
    TokenResponse,
    UserResponse,
)


def test_valid_otp_request():
    request = OTPRequestSchema(
        email="hr@example.com",
    )

    assert request.email == "hr@example.com"


def test_invalid_otp_request_email():
    with pytest.raises(ValidationError):
        OTPRequestSchema(
            email="invalid-email",
        )


def test_valid_six_digit_otp():
    request = OTPVerifySchema(
        email="hr@example.com",
        otp="123456",
    )

    assert request.otp == "123456"


def test_leading_zero_otp_is_preserved():
    request = OTPVerifySchema(
        email="hr@example.com",
        otp="019284",
    )

    assert request.otp == "019284"


def test_short_otp_is_rejected():
    with pytest.raises(ValidationError):
        OTPVerifySchema(
            email="hr@example.com",
            otp="12345",
        )


def test_long_otp_is_rejected():
    with pytest.raises(ValidationError):
        OTPVerifySchema(
            email="hr@example.com",
            otp="1234567",
        )


def test_non_numeric_otp_is_rejected():
    with pytest.raises(ValidationError):
        OTPVerifySchema(
            email="hr@example.com",
            otp="12A456",
        )


def test_otp_whitespace_is_removed():
    request = OTPVerifySchema(
        email="hr@example.com",
        otp=" 019284 ",
    )

    assert request.otp == "019284"


def test_token_response():
    response = TokenResponse(
        access_token="test-token",
    )

    assert response.access_token == "test-token"
    assert response.token_type == "bearer"


def test_user_response():
    response = UserResponse(
        id=1,
        email="hr@example.com",
        employee_id=None,
        role="HR",
        is_active=True,
    )

    assert response.id == 1
    assert response.email == "hr@example.com"
    assert response.role == "HR"
    assert response.is_active is True