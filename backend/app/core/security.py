from datetime import datetime, timedelta, timezone

import jwt

from app.core.config import settings


# --------------------------------------------------
# JWT Security
# --------------------------------------------------

def create_access_token(
    user_id: int,
    role: str,
) -> str:
    """
    Create a JWT access token for an authenticated user.

    Authentication is performed through email OTP verification.
    This function is responsible only for issuing the JWT after
    successful authentication.
    """

    now = datetime.now(timezone.utc)

    expire = now + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(user_id),
        "role": role,
        "iat": now,
        "exp": expire,
    }

    token = jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )

    return token


def decode_access_token(token: str) -> dict:
    """
    Decode and verify a JWT access token.

    Raises a JWT exception if the token is invalid,
    expired, or signed with an incorrect secret/algorithm.
    """

    payload = jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
    )

    return payload