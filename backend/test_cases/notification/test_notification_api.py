import pytest
from fastapi.testclient import TestClient

from app.authentication_service.models import User, UserRole
from app.core.security import create_access_token
from app.main import app
from app.notification_service.enums import NotificationType
from app.notification_service import service

client = TestClient(app)


def create_test_user(db, email, role=UserRole.EMPLOYEE, is_active=True):
    user = User(
        email=email,
        role=role,
        is_active=is_active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user



def get_auth_headers(user):
    token = create_access_token(user_id=user.id, role=user.role.value)
    return {"Authorization": f"Bearer {token}"}



def test_unauthenticated_notifications_access_blocked():
    resp = client.get("/notifications")
    assert resp.status_code == 401

    resp_count = client.get("/notifications/unread-count")
    assert resp_count.status_code == 401


def test_get_notifications_api(db_session):
    user = create_test_user(db_session, "api_user_notif@example.com", UserRole.EMPLOYEE)
    db_session.commit()

    service.create_notification(
        db=db_session,
        user_id=user.id,
        title="Welcome Notification",
        message="Welcome to HRMS!",
        notification_type=NotificationType.GENERAL_ANNOUNCEMENT,
    )
    db_session.commit()

    headers = get_auth_headers(user)
    response = client.get("/notifications", headers=headers)
    assert response.status_code == 200

    data = response.json()
    assert data["total"] == 1
    assert data["unread_count"] == 1
    assert len(data["items"]) == 1
    assert data["items"][0]["title"] == "Welcome Notification"


def test_get_unread_count_api(db_session):
    user = create_test_user(db_session, "api_count_user@example.com", UserRole.EMPLOYEE)
    db_session.commit()

    service.create_notification(
        db=db_session,
        user_id=user.id,
        title="Count Test",
        message="Testing unread count endpoint.",
        notification_type=NotificationType.HOLIDAY_ANNOUNCEMENT,
    )
    db_session.commit()

    headers = get_auth_headers(user)
    response = client.get("/notifications/unread-count", headers=headers)
    assert response.status_code == 200
    assert response.json() == {"unread_count": 1}


def test_mark_single_notification_read_api(db_session):
    user = create_test_user(db_session, "api_mark_single@example.com", UserRole.EMPLOYEE)
    db_session.commit()

    notif = service.create_notification(
        db=db_session,
        user_id=user.id,
        title="To Read",
        message="Please mark me as read.",
        notification_type=NotificationType.TASK_UPDATE,
    )
    db_session.commit()

    headers = get_auth_headers(user)
    response = client.patch(f"/notifications/{notif.id}/read", headers=headers)
    assert response.status_code == 200

    data = response.json()
    assert data["id"] == notif.id
    assert data["is_read"] is True
    assert data["read_at"] is not None


def test_mark_all_notifications_read_api(db_session):
    user = create_test_user(db_session, "api_mark_all@example.com", UserRole.EMPLOYEE)
    db_session.commit()

    service.create_notification(
        db=db_session,
        user_id=user.id,
        title="N1",
        message="M1",
        notification_type=NotificationType.GENERAL_ANNOUNCEMENT,
    )
    service.create_notification(
        db=db_session,
        user_id=user.id,
        title="N2",
        message="M2",
        notification_type=NotificationType.PROJECT_UPDATE,
    )
    db_session.commit()

    headers = get_auth_headers(user)
    response = client.patch("/notifications/read-all", headers=headers)
    assert response.status_code == 200

    data = response.json()
    assert data["updated_count"] == 2

    # Verify unread count is 0
    resp_count = client.get("/notifications/unread-count", headers=headers)
    assert resp_count.json()["unread_count"] == 0


def test_idor_protection_notification_read(db_session):
    user_a = create_test_user(db_session, "idor_user_a@example.com", UserRole.EMPLOYEE)
    user_b = create_test_user(db_session, "idor_user_b@example.com", UserRole.EMPLOYEE)
    db_session.commit()

    # Create notification belonging to User A
    notif_a = service.create_notification(
        db=db_session,
        user_id=user_a.id,
        title="Private Notification for A",
        message="Confidential info for user A.",
        notification_type=NotificationType.PERFORMANCE_UPDATE,
    )
    db_session.commit()

    # User B attempts to mark User A's notification as read
    headers_b = get_auth_headers(user_b)
    response = client.patch(f"/notifications/{notif_a.id}/read", headers=headers_b)

    # Must be blocked with 404 (IDOR safe)
    assert response.status_code == 404
    assert response.json()["detail"] == "Notification not found"

    # Verify User A's notification remains unread in database
    db_session.refresh(notif_a)
    assert notif_a.is_read is False
    assert notif_a.read_at is None

    # Verify User B GET /notifications does NOT return User A's notification
    resp_b_list = client.get("/notifications", headers=headers_b)
    assert resp_b_list.status_code == 200
    assert resp_b_list.json()["total"] == 0
