from datetime import datetime, timezone

import pytest
from sqlalchemy import delete

from app.audit_service.models import AuditAction, AuditLog
from app.authentication_service.models import User, UserRole
from app.core.database import SessionLocal


TEST_EMAIL = "audit-test@mediatize.com"


@pytest.fixture
def db():
    session = SessionLocal()

    # Clean previous test data
    session.execute(
        delete(AuditLog).where(
            AuditLog.user_id.in_(
                session.query(User.id)
                .filter(User.email == TEST_EMAIL)
            )
        )
    )

    session.execute(
        delete(User).where(User.email == TEST_EMAIL)
    )

    session.commit()

    yield session

    # Clean test data
    session.execute(
        delete(AuditLog).where(
            AuditLog.user_id.in_(
                session.query(User.id)
                .filter(User.email == TEST_EMAIL)
            )
        )
    )

    session.execute(
        delete(User).where(User.email == TEST_EMAIL)
    )

    session.commit()
    session.close()


@pytest.fixture
def test_user(db):
    user = User(
        email=TEST_EMAIL,
        employee_id="AUDIT001",
        role=UserRole.EMPLOYEE,
        is_active=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


def test_create_audit_log(db, test_user):
    audit_log = AuditLog(
        user_id=test_user.id,
        action=AuditAction.OTP_VERIFY_SUCCESS,
        ip_address="127.0.0.1",
    )

    db.add(audit_log)
    db.commit()
    db.refresh(audit_log)

    assert audit_log.id is not None
    assert audit_log.user_id == test_user.id
    assert audit_log.action == AuditAction.OTP_VERIFY_SUCCESS
    assert audit_log.ip_address == "127.0.0.1"


def test_audit_log_created_at(db, test_user):
    audit_log = AuditLog(
        user_id=test_user.id,
        action=AuditAction.OTP_REQUESTED,
    )

    db.add(audit_log)
    db.commit()
    db.refresh(audit_log)

    assert audit_log.created_at is not None
    assert isinstance(audit_log.created_at, datetime)


def test_audit_log_without_user(db):
    audit_log = AuditLog(
        user_id=None,
        action=AuditAction.OTP_VERIFY_FAILURE,
        ip_address="127.0.0.1",
    )

    db.add(audit_log)
    db.commit()
    db.refresh(audit_log)

    assert audit_log.id is not None
    assert audit_log.user_id is None
    assert audit_log.action == AuditAction.OTP_VERIFY_FAILURE


@pytest.mark.parametrize(
    "action",
    [
        AuditAction.LOGIN_SUCCESS,
        AuditAction.LOGIN_FAILURE,
        AuditAction.OTP_REQUESTED,
        AuditAction.OTP_VERIFY_SUCCESS,
        AuditAction.OTP_VERIFY_FAILURE,
        AuditAction.OTP_EXPIRED,
        AuditAction.OTP_ATTEMPT_LIMIT_REACHED,
        AuditAction.PASSWORD_CHANGE,
        AuditAction.PASSWORD_RESET_REQUESTED,
        AuditAction.PASSWORD_RESET_APPROVED,
        AuditAction.PASSWORD_RESET_REJECTED,
        AuditAction.LOGOUT,
        AuditAction.ACCOUNT_DEACTIVATED,
    ],
)
def test_all_audit_actions_are_valid(db, action):
    audit_log = AuditLog(
        user_id=None,
        action=action,
    )

    db.add(audit_log)
    db.commit()
    db.refresh(audit_log)

    assert audit_log.action == action