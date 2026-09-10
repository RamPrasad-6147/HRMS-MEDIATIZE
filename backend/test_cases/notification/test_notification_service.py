import pytest
from app.authentication_service.models import User, UserRole
from app.notification_service.enums import NotificationType
from app.notification_service import service


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


def test_create_notification(db_session):
    user = create_test_user(db_session, "testnotif1@example.com", UserRole.EMPLOYEE)
    user_id = user.id

    n = service.create_notification(
        db=db_session,
        user_id=user_id,
        title="Leave Approved",
        message="Your leave request has been approved.",
        notification_type=NotificationType.LEAVE_APPROVED,
        reference_id="101",
        reference_type="leave",
    )
    db_session.commit()

    assert n.id is not None
    assert n.user_id == user_id
    assert n.title == "Leave Approved"
    assert n.message == "Your leave request has been approved."
    assert n.notification_type == NotificationType.LEAVE_APPROVED
    assert n.reference_id == "101"
    assert n.reference_type == "leave"
    assert n.is_read is False
    assert n.read_at is None


def test_notify_users(db_session):
    u1 = create_test_user(db_session, "testnotif_u1@example.com", UserRole.EMPLOYEE)
    u2 = create_test_user(db_session, "testnotif_u2@example.com", UserRole.EMPLOYEE)
    u1_id, u2_id = u1.id, u2.id

    notifications = service.notify_users(
        db=db_session,
        user_ids=[u1_id, u2_id],
        title="General Announcement",
        message="Office will remain closed tomorrow.",
        notification_type=NotificationType.GENERAL_ANNOUNCEMENT,
    )
    db_session.commit()

    assert len(notifications) == 2
    recipient_ids = {n.user_id for n in notifications}
    assert u1_id in recipient_ids
    assert u2_id in recipient_ids


def test_notify_all_hr(db_session):
    hr1 = create_test_user(db_session, "testhr1@example.com", UserRole.HR)
    hr2 = create_test_user(db_session, "testhr2@example.com", UserRole.HR)
    emp = create_test_user(db_session, "testemp_notif@example.com", UserRole.EMPLOYEE)
    hr1_id, hr2_id, emp_id = hr1.id, hr2.id, emp.id

    notifs = service.notify_all_hr(
        db=db_session,
        title="New Leave Request",
        message="John applied for leave.",
        notification_type=NotificationType.LEAVE_REQUEST,
        reference_id="50",
        reference_type="leave",
    )
    db_session.commit()

    recipients = {n.user_id for n in notifs}
    assert hr1_id in recipients
    assert hr2_id in recipients
    assert emp_id not in recipients


def test_get_user_notifications_pagination_and_isolation(db_session):
    user_a = create_test_user(db_session, "usera_notif@example.com", UserRole.EMPLOYEE)
    user_b = create_test_user(db_session, "userb_notif@example.com", UserRole.EMPLOYEE)
    user_a_id, user_b_id = user_a.id, user_b.id

    # Create 3 notifications for User A, 1 for User B
    for i in range(3):
        service.create_notification(
            db=db_session,
            user_id=user_a_id,
            title=f"Title {i}",
            message=f"Message {i}",
            notification_type=NotificationType.ATTENDANCE_UPDATE,
        )

    service.create_notification(
        db=db_session,
        user_id=user_b_id,
        title="B Title",
        message="B Message",
        notification_type=NotificationType.TASK_UPDATE,
    )
    db_session.commit()

    # User A notifications check
    res_a = service.get_user_notifications(db=db_session, current_user=user_a, page=1, limit=2)
    assert res_a.total == 3
    assert len(res_a.items) == 2
    assert res_a.unread_count == 3
    assert all(item.user_id == user_a_id for item in res_a.items)

    # User B notifications check
    res_b = service.get_user_notifications(db=db_session, current_user=user_b, page=1, limit=10)
    assert res_b.total == 1
    assert len(res_b.items) == 1
    assert res_b.items[0].user_id == user_b_id


def test_get_unread_count(db_session):
    user = create_test_user(db_session, "unread_count_user@example.com", UserRole.EMPLOYEE)

    assert service.get_unread_count(db=db_session, current_user=user) == 0

    n1 = service.create_notification(
        db=db_session,
        user_id=user.id,
        title="Unread 1",
        message="M1",
        notification_type=NotificationType.GENERAL_ANNOUNCEMENT,
    )
    n2 = service.create_notification(
        db=db_session,
        user_id=user.id,
        title="Unread 2",
        message="M2",
        notification_type=NotificationType.PROJECT_UPDATE,
    )
    n1_id = n1.id
    db_session.commit()

    assert service.get_unread_count(db=db_session, current_user=user) == 2

    # Mark n1 as read
    service.mark_as_read(db=db_session, notification_id=n1_id, current_user=user)
    db_session.commit()

    assert service.get_unread_count(db=db_session, current_user=user) == 1


def test_mark_as_read_and_mark_all_as_read(db_session):
    user = create_test_user(db_session, "mark_read_user@example.com", UserRole.EMPLOYEE)

    n1 = service.create_notification(
        db=db_session,
        user_id=user.id,
        title="N1",
        message="M1",
        notification_type=NotificationType.HOLIDAY_ANNOUNCEMENT,
    )
    n2 = service.create_notification(
        db=db_session,
        user_id=user.id,
        title="N2",
        message="M2",
        notification_type=NotificationType.PERFORMANCE_UPDATE,
    )
    n1_id = n1.id
    db_session.commit()

    # Mark single as read
    read_n1 = service.mark_as_read(db=db_session, notification_id=n1_id, current_user=user)
    db_session.commit()

    assert read_n1.is_read is True
    assert read_n1.read_at is not None

    # Mark all remaining as read
    count = service.mark_all_as_read(db=db_session, current_user=user)
    db_session.commit()

    assert count == 1
    assert service.get_unread_count(db=db_session, current_user=user) == 0
