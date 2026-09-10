from datetime import datetime
from pydantic import BaseModel, EmailStr, field_validator


class OTPRequestSchema(BaseModel):
    """
    Request a login OTP using an email address.
    """

    email: EmailStr


class OTPVerifySchema(BaseModel):
    """
    Verify a 6-digit email OTP.

    OTP is intentionally represented as a string so that
    leading zeros are preserved.
    """

    email: EmailStr
    otp: str

    @field_validator("otp")
    @classmethod
    def validate_otp(cls, value: str) -> str:
        value = value.strip()

        if len(value) != 6:
            raise ValueError(
                "OTP must be exactly 6 numeric digits"
            )

        if not value.isdigit():
            raise ValueError(
                "OTP must be exactly 6 numeric digits"
            )

        return value


class OTPRequestResponse(BaseModel):
    """
    Response returned after requesting an OTP.

    The actual OTP is never returned by the API.
    """

    message: str
    expires_in_seconds: int


class TokenResponse(BaseModel):
    """
    JWT returned after successful OTP verification.
    """

    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """
    Public authenticated-user information.
    """

    id: int
    email: EmailStr
    employee_id: str | None
    role: str
    is_active: bool
    first_name: str | None = None
    last_name: str | None = None
    profile_photo_url: str | None = None


class HRProfileResponse(BaseModel):
    """
    Response schema for HR Profile details.
    """

    id: int
    email: EmailStr
    role: str
    is_active: bool
    first_name: str | None = None
    last_name: str | None = None
    address: str | None = None
    profile_photo_url: str | None = None
    employee_id: str | None = None
    last_login_at: datetime | None = None
    created_at: datetime | None = None


class HRProfileUpdateSchema(BaseModel):
    """
    Schema for updating editable HR Profile fields (Name & Optional Address).
    Email, Role, and is_active MUST NOT be editable.
    """

    first_name: str | None = None
    last_name: str | None = None
    address: str | None = None
