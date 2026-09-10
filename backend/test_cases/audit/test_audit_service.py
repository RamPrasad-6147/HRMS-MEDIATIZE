from sqlalchemy import delete

from app.audit_service.models import AuditAction, AuditLog
from app.audit_service.service import create_audit_log
from app.authentication_service.models import User, UserRole


TEST_EMAIL = "audit-service-test@mediatize.com"


def cleanup(db_session):
    user = (
        db_session.query(User)
        .filter(User.email == TEST_EMAIL)
        .first()
    )

    if user:
        # Delete audit logs first because they reference the user.
        db_session.execute(
            delete(AuditLog).where(
                AuditLog.user_id == user.id
            )
        )

        # Now the user can safely be deleted.
        db_session.delete(user)
        db_session.commit()


def test_create_audit_log_with_user(db_session):
    cleanup(db_session)

    user = User(
        email=TEST_EMAIL,
        employee_id="AUDIT001",
        role=UserRole.EMPLOYEE,
        is_active=True,
    )

    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    audit_log = create_audit_log(
        db=db_session,
        action=AuditAction.LOGIN_SUCCESS,
        user_id=user.id,
        ip_address="127.0.0.1",
    )

    assert audit_log.id is not None
    assert audit_log.user_id == user.id
    assert audit_log.action == AuditAction.LOGIN_SUCCESS
    assert audit_log.ip_address == "127.0.0.1"
    assert audit_log.created_at is not None

    cleanup(db_session)


def test_create_audit_log_without_user(db_session):
    audit_log = create_audit_log(
        db=db_session,
        action=AuditAction.LOGIN_FAILURE,
        user_id=None,
        ip_address="127.0.0.1",
    )

    assert audit_log.id is not None
    assert audit_log.user_id is None
    assert audit_log.action == AuditAction.LOGIN_FAILURE
    assert audit_log.ip_address == "127.0.0.1"
    assert audit_log.created_at is not None