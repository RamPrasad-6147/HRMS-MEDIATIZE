import uuid
from datetime import date, datetime, timedelta, timezone
import pytest
from fastapi import status
from fastapi.testclient import TestClient

from app.main import app
from app.authentication_service.models import User, UserRole
from app.employee_service.models import Employee, EmploymentStatus
from app.core.security import create_access_token
from app.project_service.models import (
    AssignmentStatus,
    Project,
    ProjectAssignment,
    ProjectPriority,
    ProjectRole as DBProjectRole,
    ProjectStatus,
)
from app.announcement_service.models import Announcement, AnnouncementRead
from app.announcement_service.enums import (
    AnnouncementPriority,
    AnnouncementScope,
    AnnouncementStatus,
    AnnouncementType,
)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def hr_user_and_token(db_session):
    unique_id = uuid.uuid4().hex[:8]
    user = User(
        email=f"hr_anc_{unique_id}@example.com",
        role=UserRole.HR,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    token = create_access_token(user_id=user.id, role=user.role.value)
    return user, token


@pytest.fixture
def emp1_and_token(db_session):
    unique_id = uuid.uuid4().hex[:8]
    user = User(
        email=f"emp1_anc_{unique_id}@example.com",
        role=UserRole.EMPLOYEE,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    employee = Employee(
        user_id=user.id,
        employee_code=f"EMP{unique_id[:4].upper()}",
        first_name="Emp1",
        last_name="Tester",
        joining_date=date.today(),
        employment_status=EmploymentStatus.ACTIVE,
    )
    db_session.add(employee)
    db_session.commit()
    db_session.refresh(employee)

    token = create_access_token(user_id=user.id, role=user.role.value)
    return user, employee, token


@pytest.fixture
def emp2_and_token(db_session):
    unique_id = uuid.uuid4().hex[:8]
    user = User(
        email=f"emp2_anc_{unique_id}@example.com",
        role=UserRole.EMPLOYEE,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    employee = Employee(
        user_id=user.id,
        employee_code=f"EMP{unique_id[:4].upper()}",
        first_name="Emp2",
        last_name="Tester",
        joining_date=date.today(),
        employment_status=EmploymentStatus.ACTIVE,
    )
    db_session.add(employee)
    db_session.commit()
    db_session.refresh(employee)

    token = create_access_token(user_id=user.id, role=user.role.value)
    return user, employee, token


@pytest.fixture
def sample_project_and_assignment(db_session, emp1_and_token):
    _, emp1, _ = emp1_and_token

    # Project Role
    role = DBProjectRole(name=f"Backend Dev {uuid.uuid4().hex[:4]}", is_active=True)
    db_session.add(role)
    db_session.commit()

    # Project
    proj_code = f"PRJ-{uuid.uuid4().hex[:4].upper()}"
    project = Project(
        project_code=proj_code,
        name="HRMS Mobile App",
        start_date=date.today(),
        priority=ProjectPriority.HIGH,
        status=ProjectStatus.IN_PROGRESS,
    )
    db_session.add(project)
    db_session.commit()

    # Assign emp1 to project
    assignment = ProjectAssignment(
        project_id=project.id,
        employee_id=emp1.id,
        project_role_id=role.id,
        status=AssignmentStatus.ACTIVE,
        assigned_date=date.today(),
    )
    db_session.add(assignment)
    db_session.commit()

    return project, assignment


def test_create_company_announcement_success(client, hr_user_and_token):
    _, hr_token = hr_user_and_token
    payload = {
        "title": "Annual Company Meetup 2026",
        "content": "All employees are invited to the annual meetup next month.",
        "announcement_type": "COMPANY_UPDATE",
        "priority": "IMPORTANT",
        "announcement_scope": "COMPANY",
        "publish_now": True,
    }
    response = client.post(
        "/announcements",
        json=payload,
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["title"] == payload["title"]
    assert data["announcement_scope"] == "COMPANY"
    assert data["project_id"] is None
    assert data["status"] == "PUBLISHED"
    assert data["published_at"] is not None


def test_company_announcement_rejects_project_id(client, hr_user_and_token):
    _, hr_token = hr_user_and_token
    payload = {
        "title": "Invalid Company Announcement",
        "content": "Testing invalid payload",
        "announcement_scope": "COMPANY",
        "project_id": 999,
    }
    response = client.post(
        "/announcements",
        json=payload,
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_project_announcement_requires_project_id(client, hr_user_and_token):
    _, hr_token = hr_user_and_token
    payload = {
        "title": "Invalid Project Announcement",
        "content": "Testing missing project id",
        "announcement_scope": "PROJECT",
        "project_id": None,
    }
    response = client.post(
        "/announcements",
        json=payload,
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_hr_project_search(client, hr_user_and_token, sample_project_and_assignment):
    _, hr_token = hr_user_and_token
    project, _ = sample_project_and_assignment

    response = client.get(
        f"/announcements/projects/search?search={project.project_code}",
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) >= 1
    matched = [p for p in data if p["id"] == project.id]
    assert len(matched) == 1
    assert matched[0]["member_count"] == 1


def test_create_project_announcement_success(
    client, hr_user_and_token, sample_project_and_assignment
):
    _, hr_token = hr_user_and_token
    project, _ = sample_project_and_assignment

    payload = {
        "title": "Sprint 5 Planning Notice",
        "content": "Sprint 5 starts this Monday for HRMS Mobile team.",
        "announcement_type": "GENERAL",
        "priority": "URGENT",
        "announcement_scope": "PROJECT",
        "project_id": project.id,
        "publish_now": True,
    }
    response = client.post(
        "/announcements",
        json=payload,
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["title"] == payload["title"]
    assert data["announcement_scope"] == "PROJECT"
    assert data["project_id"] == project.id
    assert data["project_code"] == project.project_code


def test_employee_feed_access_control(
    client, hr_user_and_token, emp1_and_token, emp2_and_token, sample_project_and_assignment
):
    _, hr_token = hr_user_and_token
    _, _, emp1_token = emp1_and_token
    _, _, emp2_token = emp2_and_token
    project, _ = sample_project_and_assignment

    # 1. HR publishes Company Announcement
    client.post(
        "/announcements",
        json={
            "title": "Holiday Notice",
            "content": "Office remains closed tomorrow.",
            "announcement_scope": "COMPANY",
            "publish_now": True,
        },
        headers={"Authorization": f"Bearer {hr_token}"},
    )

    # 2. HR publishes Project Announcement for `project` (where emp1 is assigned, emp2 is NOT)
    res_proj = client.post(
        "/announcements",
        json={
            "title": "Project Deployment Alert",
            "content": "Deployment at 6 PM.",
            "announcement_scope": "PROJECT",
            "project_id": project.id,
            "publish_now": True,
        },
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    proj_announcement_id = res_proj.json()["id"]

    # 3. Check emp1 feed -> Should see BOTH company & project announcements
    res_emp1 = client.get(
        "/announcements/employee",
        headers={"Authorization": f"Bearer {emp1_token}"},
    )
    assert res_emp1.status_code == status.HTTP_200_OK
    emp1_ids = [item["id"] for item in res_emp1.json()["items"]]
    assert proj_announcement_id in emp1_ids

    # 4. Check emp2 feed -> Should see company announcement, but NOT project announcement
    res_emp2 = client.get(
        "/announcements/employee",
        headers={"Authorization": f"Bearer {emp2_token}"},
    )
    assert res_emp2.status_code == status.HTTP_200_OK
    emp2_ids = [item["id"] for item in res_emp2.json()["items"]]
    assert proj_announcement_id not in emp2_ids

    # 5. Direct access by emp2 to project announcement -> 403 Forbidden
    res_emp2_direct = client.get(
        f"/announcements/{proj_announcement_id}",
        headers={"Authorization": f"Bearer {emp2_token}"},
    )
    assert res_emp2_direct.status_code == status.HTTP_403_FORBIDDEN


def test_mark_announcement_as_read_idempotent(
    client, hr_user_and_token, emp1_and_token
):
    _, hr_token = hr_user_and_token
    _, _, emp1_token = emp1_and_token

    # Create company announcement
    res_create = client.post(
        "/announcements",
        json={
            "title": "Safety Guidelines",
            "content": "Please follow emergency exit rules.",
            "announcement_scope": "COMPANY",
            "publish_now": True,
        },
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    ann_id = res_create.json()["id"]

    # First read call
    res_read1 = client.post(
        f"/announcements/{ann_id}/read",
        headers={"Authorization": f"Bearer {emp1_token}"},
    )
    assert res_read1.status_code == status.HTTP_200_OK
    data1 = res_read1.json()
    assert data1["message"] == "Announcement marked as read."

    # Second read call (idempotent)
    res_read2 = client.post(
        f"/announcements/{ann_id}/read",
        headers={"Authorization": f"Bearer {emp1_token}"},
    )
    assert res_read2.status_code == status.HTTP_200_OK
    data2 = res_read2.json()
    assert data2["message"] == "Announcement already marked as read."


def test_publish_and_archive_lifecycle(client, hr_user_and_token, emp1_and_token):
    _, hr_token = hr_user_and_token
    _, _, emp1_token = emp1_and_token

    # Create DRAFT
    res_draft = client.post(
        "/announcements",
        json={
            "title": "Draft Policy Update",
            "content": "This policy is under review.",
            "announcement_scope": "COMPANY",
            "publish_now": False,
        },
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    ann_id = res_draft.json()["id"]
    assert res_draft.json()["status"] == "DRAFT"

    # Employee feed before publish -> Draft not visible
    res_emp_before = client.get(
        "/announcements/employee",
        headers={"Authorization": f"Bearer {emp1_token}"},
    )
    ids_before = [item["id"] for item in res_emp_before.json()["items"]]
    assert ann_id not in ids_before

    # Publish draft
    res_pub = client.post(
        f"/announcements/{ann_id}/publish",
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert res_pub.status_code == status.HTTP_200_OK
    assert res_pub.json()["status"] == "PUBLISHED"

    # Employee feed after publish -> Visible
    res_emp_after = client.get(
        "/announcements/employee",
        headers={"Authorization": f"Bearer {emp1_token}"},
    )
    ids_after = [item["id"] for item in res_emp_after.json()["items"]]
    assert ann_id in ids_after

    # Archive announcement
    res_arch = client.post(
        f"/announcements/{ann_id}/archive",
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert res_arch.status_code == status.HTTP_200_OK
    assert res_arch.json()["status"] == "ARCHIVED"

    # Employee feed after archive -> Hidden
    res_emp_archived = client.get(
        "/announcements/employee",
        headers={"Authorization": f"Bearer {emp1_token}"},
    )
    ids_archived = [item["id"] for item in res_emp_archived.json()["items"]]
    assert ann_id not in ids_archived

    # Attempting to republish archived announcement -> 400 Bad Request
    res_repub = client.post(
        f"/announcements/{ann_id}/publish",
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert res_repub.status_code == status.HTTP_400_BAD_REQUEST


def test_announcement_email_dispatch_and_error_resilience(
    client,
    hr_user_and_token,
    emp1_and_token,
):
    from unittest.mock import patch

    _, hr_token = hr_user_and_token
    _, emp1, _ = emp1_and_token

    hr_headers = {"Authorization": f"Bearer {hr_token}"}

    # 1. Email dispatch succeeds upon creation with publish_now=True
    with patch("app.announcement_service.service.send_announcement_email") as mock_send:
        res = client.post(
            "/announcements",
            json={
                "title": "Email Test Announcement",
                "content": "Testing email dispatch",
                "announcement_scope": "COMPANY",
                "publish_now": True,
            },
            headers=hr_headers,
        )
        assert res.status_code == status.HTTP_201_CREATED
        assert mock_send.called
        recipients = [call.kwargs["recipient_email"] for call in mock_send.call_args_list]
        assert emp1.user.email in recipients

    # 2. Email failure does NOT cause announcement creation to fail
    with patch("app.announcement_service.service.send_announcement_email", side_effect=Exception("SMTP Connection Error")):
        res_fail = client.post(
            "/announcements",
            json={
                "title": "Resilient Announcement",
                "content": "Testing SMTP exception handling",
                "announcement_scope": "COMPANY",
                "publish_now": True,
            },
            headers=hr_headers,
        )
        assert res_fail.status_code == status.HTTP_201_CREATED
        assert res_fail.json()["title"] == "Resilient Announcement"

