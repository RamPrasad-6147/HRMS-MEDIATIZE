from unittest.mock import patch

import pytest

from sqlalchemy import delete, select

from app.authentication_service.models import User
from app.audit_service.models import AuditLog
from app.core.database import SessionLocal


@pytest.fixture(autouse=True)
def mock_email_dispatch():
    """
    Prevent real emails from being sent during tests.
    """

    with (
        patch(
            "app.performance_service.service.send_performance_feedback_email",
            return_value=True,
        ),
        patch(
            "app.email_service.service.send_email",
            return_value=True,
        ),
    ):
        yield


@pytest.fixture
def db_session():
    """
    Provide a database session for tests.

    The test database schema is created from the current SQLAlchemy
    models and test data is cleaned before and after every test.
    """

    from app.core.database import Base, engine

    # Import all models so SQLAlchemy registers their metadata.
    import app.authentication_service.models  # noqa: F401
    import app.employee_service.models  # noqa: F401
    import app.audit_service.models  # noqa: F401
    import app.attendance_service.models  # noqa: F401
    import app.leave_service.models  # noqa: F401
    import app.project_service.models  # noqa: F401
    import app.announcement_service.models  # noqa: F401
    import app.work_report_service.models  # noqa: F401
    import app.complaint_service.models  # noqa: F401
    import app.performance_service.models  # noqa: F401
    import app.notification_service.models  # noqa: F401

    Base.metadata.create_all(bind=engine)

    def cleanup_test_data(session):
        """
        Remove test data created by the test suite.

        Test users are identified by the @example.com domain.
        """

        try:
            session.rollback()

            # --------------------------------------------------
            # Find test users
            # --------------------------------------------------

            test_user_ids = session.scalars(
                select(User.id).where(
                    User.email.like("%@example.com")
                )
            ).all()

            if not test_user_ids:
                return

            # --------------------------------------------------
            # Email OTPs
            # --------------------------------------------------

            from app.authentication_service.models import EmailOTP

            session.execute(
                delete(EmailOTP).where(
                    EmailOTP.user_id.in_(test_user_ids)
                )
            )

            # --------------------------------------------------
            # Audit logs
            # --------------------------------------------------

            session.execute(
                delete(AuditLog).where(
                    AuditLog.user_id.in_(test_user_ids)
                )
            )

            # --------------------------------------------------
            # Notifications
            # --------------------------------------------------

            from app.notification_service.models import Notification

            session.execute(
                delete(Notification).where(
                    Notification.user_id.in_(test_user_ids)
                )
            )

            # --------------------------------------------------
            # Employee-related records
            # --------------------------------------------------

            from app.attendance_service.models import Attendance
            from app.employee_service.models import Employee
            from app.leave_service.models import (
                LeaveAttachment,
                LeaveBalance,
                LeaveRequest,
                LeaveType,
            )
            from app.performance_service.models import (
                PerformanceGoal,
                PerformanceReview,
                PerformanceReviewRating,
            )
            from app.work_report_service.models import DailyWorkReport

            emp_ids = session.scalars(
                select(Employee.id).where(
                    Employee.user_id.in_(test_user_ids)
                )
            ).all()

            if emp_ids:

                # --------------------------------------------------
                # Daily work reports
                # --------------------------------------------------

                session.execute(
                    delete(DailyWorkReport).where(
                        DailyWorkReport.employee_id.in_(emp_ids)
                    )
                )

                # --------------------------------------------------
                # Attendance
                # --------------------------------------------------

                session.execute(
                    delete(Attendance).where(
                        Attendance.employee_id.in_(emp_ids)
                    )
                )

                # --------------------------------------------------
                # Performance goals
                # --------------------------------------------------

                session.execute(
                    delete(PerformanceGoal).where(
                        PerformanceGoal.employee_id.in_(emp_ids)
                    )
                )

                # --------------------------------------------------
                # Performance reviews and ratings
                # --------------------------------------------------

                review_ids = session.scalars(
                    select(PerformanceReview.id).where(
                        PerformanceReview.employee_id.in_(emp_ids)
                    )
                ).all()

                if review_ids:
                    session.execute(
                        delete(PerformanceReviewRating).where(
                            PerformanceReviewRating.review_id.in_(review_ids)
                        )
                    )

                session.execute(
                    delete(PerformanceReview).where(
                        PerformanceReview.employee_id.in_(emp_ids)
                    )
                )

                # --------------------------------------------------
                # Leave requests and attachments
                # --------------------------------------------------

                request_ids = session.scalars(
                    select(LeaveRequest.id).where(
                        LeaveRequest.employee_id.in_(emp_ids)
                    )
                ).all()

                if request_ids:
                    session.execute(
                        delete(LeaveAttachment).where(
                            LeaveAttachment.leave_request_id.in_(request_ids)
                        )
                    )

                session.execute(
                    delete(LeaveRequest).where(
                        LeaveRequest.employee_id.in_(emp_ids)
                    )
                )

                # --------------------------------------------------
                # Leave balances
                # --------------------------------------------------

                session.execute(
                    delete(LeaveBalance).where(
                        LeaveBalance.employee_id.in_(emp_ids)
                    )
                )

            # --------------------------------------------------
            # Announcements
            # --------------------------------------------------

            from app.announcement_service.models import (
                Announcement,
                AnnouncementRead,
            )

            if emp_ids:
                session.execute(
                    delete(AnnouncementRead).where(
                        AnnouncementRead.employee_id.in_(emp_ids)
                    )
                )

            session.execute(
                delete(Announcement).where(
                    Announcement.created_by.in_(test_user_ids)
                )
            )

            # --------------------------------------------------
            # Project assignments
            # --------------------------------------------------

            from app.project_service.models import ProjectAssignment

            if emp_ids:
                session.execute(
                    delete(ProjectAssignment).where(
                        ProjectAssignment.employee_id.in_(emp_ids)
                    )
                )

            # --------------------------------------------------
            # Test leave types
            # --------------------------------------------------

            session.execute(
                delete(LeaveType).where(
                    (LeaveType.name.like("%Test%"))
                    | (LeaveType.name.like("%API%"))
                )
            )

            # --------------------------------------------------
            # Employee profiles
            # --------------------------------------------------

            session.execute(
                delete(Employee).where(
                    Employee.user_id.in_(test_user_ids)
                )
            )

            # --------------------------------------------------
            # Users
            # --------------------------------------------------

            session.execute(
                delete(User).where(
                    User.id.in_(test_user_ids)
                )
            )

            session.commit()

        except Exception:
            session.rollback()

    db = SessionLocal()

    # Clean stale test data before the test.
    cleanup_test_data(db)

    try:
        yield db
    finally:
        # Clean test data created by the test.
        cleanup_test_data(db)

        try:
            db.close()
        except Exception:
            pass