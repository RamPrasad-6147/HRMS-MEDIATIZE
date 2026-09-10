import pytest
from fastapi import HTTPException
from app.authentication_service.dependencies import (
    get_current_hr,
    get_current_user,
    validate_hr_user,
)
from app.authentication_service.models import User, UserRole
from app.core.security import create_access_token


def create_test_user(db_session, email, role):
    user = User(
        email=email,
        employee_id=None,
        role=role,
        is_active=True,
    )

    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    return user


def test_get_current_user_returns_active_user(db_session):
    user = create_test_user(
        db_session,
        "auth_user@example.com",
        UserRole.EMPLOYEE,
    )

    token = create_access_token(
        user_id=user.id,
        role=user.role.value,
    )

    current_user = get_current_user(
        token=token,
        db=db_session,
    )

    assert current_user.id == user.id
    assert current_user.email == "auth_user@example.com"
    assert current_user.role == UserRole.EMPLOYEE
    assert current_user.is_active is True


def test_get_current_hr_returns_hr_user(db_session):
    user = create_test_user(
        db_session,
        "auth_hr@example.com",
        UserRole.HR,
    )

    token = create_access_token(
        user_id=user.id,
        role=user.role.value,
    )

    current_user = get_current_user(
        token=token,
        db=db_session,
    )

    current_hr = validate_hr_user(
        current_user
    )

    assert current_hr.id == user.id
    assert current_hr.email == "auth_hr@example.com"
    assert current_hr.role == UserRole.HR


def test_get_current_hr_rejects_employee(db_session):
    user = create_test_user(
        db_session,
        "auth_employee@example.com",
        UserRole.EMPLOYEE,
    )

    token = create_access_token(
        user_id=user.id,
        role=user.role.value,
    )

    current_user = get_current_user(
        token=token,
        db=db_session,
    )

    with pytest.raises(HTTPException):
        validate_hr_user(
            current_user
        )


def test_get_current_user_rejects_inactive_user(db_session):
    user = create_test_user(
        db_session,
        "inactive_user@example.com",
        UserRole.EMPLOYEE,
    )

    user.is_active = False
    db_session.commit()

    token = create_access_token(
        user_id=user.id,
        role=user.role.value,
    )

    with pytest.raises(HTTPException):
        get_current_user(
            token=token,
            db=db_session,
        )