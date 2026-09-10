from datetime import datetime, timezone

import jwt
import pytest

from app.core.config import settings
from app.core.security import (
    create_access_token,
    decode_access_token,
)


def test_create_access_token():
    token = create_access_token(
        user_id=1,
        role="HR",
    )

    assert isinstance(token, str)
    assert len(token) > 0


def test_jwt_contains_required_claims():
    token = create_access_token(
        user_id=1,
        role="HR",
    )

    payload = decode_access_token(token)

    assert payload["sub"] == "1"
    assert payload["role"] == "HR"
    assert "iat" in payload
    assert "exp" in payload


def test_jwt_expiration_is_after_issue_time():
    token = create_access_token(
        user_id=1,
        role="HR",
    )

    payload = decode_access_token(token)

    iat = datetime.fromtimestamp(
        payload["iat"],
        tz=timezone.utc,
    )

    exp = datetime.fromtimestamp(
        payload["exp"],
        tz=timezone.utc,
    )

    assert exp > iat


def test_employee_role_is_preserved():
    token = create_access_token(
        user_id=2,
        role="EMPLOYEE",
    )

    payload = decode_access_token(token)

    assert payload["sub"] == "2"
    assert payload["role"] == "EMPLOYEE"


def test_invalid_token_is_rejected():
    invalid_token = "this.is.not.a.valid.jwt"

    with pytest.raises(jwt.InvalidTokenError):
        decode_access_token(invalid_token)


def test_token_signed_with_wrong_secret_is_rejected():
    token = jwt.encode(
        {
            "sub": "1",
            "role": "HR",
        },
        "this-is-a-wrong-secret-key-for-testing-only-32",
        algorithm=settings.JWT_ALGORITHM,
    )

    with pytest.raises(jwt.InvalidTokenError):
        decode_access_token(token)