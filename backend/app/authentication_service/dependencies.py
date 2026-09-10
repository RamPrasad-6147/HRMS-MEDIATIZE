from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.authentication_service.models import User, UserRole
from app.core.database import get_db
from app.core.security import decode_access_token


security = HTTPBearer(
    auto_error=False,
)


def get_current_user(
    token: HTTPAuthorizationCredentials | str | None = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """
    Return the currently authenticated active user.

    Authentication is passwordless.

    The user first verifies an OTP sent to their email.
    Successful OTP verification creates a JWT.
    This dependency validates that JWT and loads the
    corresponding active user.

    Supports:
    - FastAPI dependency injection.
    - Direct unit-test calls using token=<jwt>.
    """

    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    if isinstance(
        token,
        HTTPAuthorizationCredentials,
    ):
        access_token = token.credentials

    elif isinstance(token, str):
        access_token = token

    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )

    try:
        payload = decode_access_token(
            access_token
        )

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )

    subject = payload.get("sub")

    if not subject:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )

    try:
        user_id = int(subject)

    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )

    user = db.scalar(
        select(User).where(
            User.id == user_id
        )
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    return user


def validate_hr_user(
    current_user: User,
) -> User:
    """
    Validate that the authenticated user has the HR role.

    This is a normal Python helper and is intentionally kept
    separate from FastAPI dependency injection.
    """

    if current_user.role != UserRole.HR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="HR access required",
        )

    return current_user


def get_current_hr(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Return the currently authenticated HR user.

    FastAPI obtains the authenticated user through
    get_current_user(), then validates the role.

    Role is determined server-side from the database.
    """

    return validate_hr_user(
        current_user
    )