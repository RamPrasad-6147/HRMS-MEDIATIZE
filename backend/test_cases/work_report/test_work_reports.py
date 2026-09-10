import io
from datetime import date
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select

from app.authentication_service.models import User, UserRole
from app.core.security import create_access_token
from app.employee_service.models import Employee, EmploymentStatus
from app.project_service.models import (
    AssignmentStatus,
    Project,
    ProjectAssignment,
    ProjectPriority,
    ProjectRole,
    ProjectStatus,
)
from app.work_report_service.models import DailyWorkReport


@pytest.fixture
def test_setup_data(db_session):
    """
    Setup helper fixture creating test HR user, test Employee 1, test Employee 2, and test projects.
    Idempotent: Reuses or creates test entities safely.
    """
    # 1. HR User
    hr_user = db_session.scalar(select(User).where(User.email == "hr.workreport@example.com"))
    if not hr_user:
        hr_user = User(
            email="hr.workreport@example.com",
            role=UserRole.HR,
            is_active=True,
        )
        db_session.add(hr_user)

    # 2. Employee User 1 & Employee 1
    emp_user1 = db_session.scalar(select(User).where(User.email == "emp1.workreport@example.com"))
    if not emp_user1:
        emp_user1 = User(
            email="emp1.workreport@example.com",
            role=UserRole.EMPLOYEE,
            is_active=True,
        )
        db_session.add(emp_user1)

    # 3. Employee User 2 & Employee 2
    emp_user2 = db_session.scalar(select(User).where(User.email == "emp2.workreport@example.com"))
    if not emp_user2:
        emp_user2 = User(
            email="emp2.workreport@example.com",
            role=UserRole.EMPLOYEE,
            is_active=True,
        )
        db_session.add(emp_user2)

    db_session.flush()

    employee1 = db_session.scalar(select(Employee).where(Employee.user_id == emp_user1.id))
    if not employee1:
        employee1 = Employee(
            user_id=emp_user1.id,
            employee_code="WR_EMP_001",
            first_name="Alice",
            last_name="Report",
            employment_status=EmploymentStatus.ACTIVE,
        )
        db_session.add(employee1)

    employee2 = db_session.scalar(select(Employee).where(Employee.user_id == emp_user2.id))
    if not employee2:
        employee2 = Employee(
            user_id=emp_user2.id,
            employee_code="WR_EMP_002",
            first_name="Bob",
            last_name="Report",
            employment_status=EmploymentStatus.ACTIVE,
        )
        db_session.add(employee2)

    db_session.flush()

    # 4. Project Role
    project_role = db_session.scalar(select(ProjectRole).where(ProjectRole.name == "Developer Role WR"))
    if not project_role:
        project_role = ProjectRole(
            name="Developer Role WR",
            description="Test role for work reports",
            is_active=True,
        )
        db_session.add(project_role)

    db_session.flush()

    # 5. Assigned & Unassigned Projects
    project_assigned = db_session.scalar(select(Project).where(Project.project_code == "PRJ_WR_01"))
    if not project_assigned:
        project_assigned = Project(
            project_code="PRJ_WR_01",
            name="Assigned Work Report Project",
            start_date=date.today(),
            priority=ProjectPriority.HIGH,
            status=ProjectStatus.IN_PROGRESS,
        )
        db_session.add(project_assigned)

    project_unassigned = db_session.scalar(select(Project).where(Project.project_code == "PRJ_WR_02"))
    if not project_unassigned:
        project_unassigned = Project(
            project_code="PRJ_WR_02",
            name="Unassigned Work Report Project",
            start_date=date.today(),
            priority=ProjectPriority.LOW,
            status=ProjectStatus.PLANNED,
        )
        db_session.add(project_unassigned)

    db_session.flush()

    # 6. Project Assignments
    assignment1 = db_session.scalar(select(ProjectAssignment).where(
        ProjectAssignment.project_id == project_assigned.id,
        ProjectAssignment.employee_id == employee1.id,
    ))
    if not assignment1:
        assignment1 = ProjectAssignment(
            project_id=project_assigned.id,
            employee_id=employee1.id,
            project_role_id=project_role.id,
            status=AssignmentStatus.ACTIVE,
        )
        db_session.add(assignment1)

    assignment2 = db_session.scalar(select(ProjectAssignment).where(
        ProjectAssignment.project_id == project_assigned.id,
        ProjectAssignment.employee_id == employee2.id,
    ))
    if not assignment2:
        assignment2 = ProjectAssignment(
            project_id=project_assigned.id,
            employee_id=employee2.id,
            project_role_id=project_role.id,
            status=AssignmentStatus.ACTIVE,
        )
        db_session.add(assignment2)

    db_session.commit()

    token_emp1 = create_access_token(emp_user1.id, "EMPLOYEE")
    token_emp2 = create_access_token(emp_user2.id, "EMPLOYEE")
    token_hr = create_access_token(hr_user.id, "HR")

    headers_emp1 = {"Authorization": f"Bearer {token_emp1}"}
    headers_emp2 = {"Authorization": f"Bearer {token_emp2}"}
    headers_hr = {"Authorization": f"Bearer {token_hr}"}

    return {
        "hr_user": hr_user,
        "emp_user1": emp_user1,
        "emp_user2": emp_user2,
        "employee1": employee1,
        "employee2": employee2,
        "project_assigned": project_assigned,
        "project_unassigned": project_unassigned,
        "headers_emp1": headers_emp1,
        "headers_emp2": headers_emp2,
        "headers_hr": headers_hr,
    }


def test_authenticated_employee_can_submit_report(db_session, test_setup_data):
    from app.main import app
    client = TestClient(app)

    data = test_setup_data
    response = client.post(
        "/work-reports",
        data={
            "project_id": data["project_assigned"].id,
            "work_description": "Completed frontend layout integration for Work Reports.",
            "problems_faced": "None",
        },
        headers=data["headers_emp1"],
    )

    assert response.status_code == 201
    res_data = response.json()
    assert res_data["project_id"] == data["project_assigned"].id
    assert res_data["employee_id"] == data["employee1"].id
    assert res_data["work_description"] == "Completed frontend layout integration for Work Reports."
    assert res_data["report_date"] == str(date.today())


def test_unauthenticated_user_cannot_submit_report():
    from app.main import app
    client = TestClient(app)

    response = client.post(
        "/work-reports",
        data={
            "project_id": 1,
            "work_description": "Attempting unauthenticated submission",
        },
    )

    assert response.status_code == 401


def test_employee_can_submit_only_for_active_assigned_project(db_session, test_setup_data):
    from app.main import app
    client = TestClient(app)

    data = test_setup_data
    # Unassigned project submission attempt
    response = client.post(
        "/work-reports",
        data={
            "project_id": data["project_unassigned"].id,
            "work_description": "Trying to submit for unassigned project",
        },
        headers=data["headers_emp1"],
    )

    assert response.status_code == 403
    assert "not actively assigned" in response.json()["detail"]


def test_duplicate_same_day_report_returns_conflict(db_session, test_setup_data):
    from app.main import app
    client = TestClient(app)

    data = test_setup_data
    # First report
    client.post(
        "/work-reports",
        data={
            "project_id": data["project_assigned"].id,
            "work_description": "First submission of the day",
        },
        headers=data["headers_emp1"],
    )

    # Second report for same project on same day
    response = client.post(
        "/work-reports",
        data={
            "project_id": data["project_assigned"].id,
            "work_description": "Duplicate submission attempt",
        },
        headers=data["headers_emp1"],
    )

    assert response.status_code == 409
    assert "already submitted a work report" in response.json()["detail"]


def test_employee_cannot_view_another_employee_report(db_session, test_setup_data):
    from app.main import app
    client = TestClient(app)

    data = test_setup_data

    # Emp 2 submits a report
    create_res = client.post(
        "/work-reports",
        data={
            "project_id": data["project_assigned"].id,
            "work_description": "Emp 2 work report",
        },
        headers=data["headers_emp2"],
    )
    report_id = create_res.json()["id"]

    # Emp 1 tries to view Emp 2's report
    response = client.get(
        f"/work-reports/my/{report_id}",
        headers=data["headers_emp1"],
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Work report not found."


def test_employee_cannot_access_hr_reports(db_session, test_setup_data):
    from app.main import app
    client = TestClient(app)

    data = test_setup_data
    # Emp 1 tries HR endpoints
    res1 = client.get("/work-reports", headers=data["headers_emp1"])
    assert res1.status_code == 403

    res2 = client.get("/work-reports/today", headers=data["headers_emp1"])
    assert res2.status_code == 403


def test_hr_can_view_all_reports(db_session, test_setup_data):
    from app.main import app
    client = TestClient(app)

    data = test_setup_data

    # Emp 1 submits report
    client.post(
        "/work-reports",
        data={
            "project_id": data["project_assigned"].id,
            "work_description": "Emp 1 report for HR view",
        },
        headers=data["headers_emp1"],
    )

    # HR fetches reports
    response = client.get("/work-reports", headers=data["headers_hr"])
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["total"] >= 1
    assert len(res_data["items"]) >= 1


def test_hr_can_view_todays_reports(db_session, test_setup_data):
    from app.main import app
    client = TestClient(app)

    data = test_setup_data

    # Emp 1 submits report
    client.post(
        "/work-reports",
        data={
            "project_id": data["project_assigned"].id,
            "work_description": "Emp 1 today's report",
        },
        headers=data["headers_emp1"],
    )

    # HR calls /work-reports/today
    response = client.get("/work-reports/today", headers=data["headers_hr"])
    assert response.status_code == 200
    res_data = response.json()
    assert "today_count" in res_data
    assert res_data["today_count"] >= 1


def test_report_date_is_backend_controlled(db_session, test_setup_data):
    from app.main import app
    client = TestClient(app)

    data = test_setup_data
    # User sends fake report_date in payload
    response = client.post(
        "/work-reports",
        data={
            "project_id": data["project_assigned"].id,
            "work_description": "Testing report date backend enforcement",
            "report_date": "2020-01-01",  # Fake date attempt
        },
        headers=data["headers_emp1"],
    )

    assert response.status_code == 201
    res_data = response.json()
    # Backend date must override any fake date
    assert res_data["report_date"] == str(date.today())


def test_employee_cannot_set_employee_id(db_session, test_setup_data):
    from app.main import app
    client = TestClient(app)

    data = test_setup_data
    # Emp 1 tries to send employee_id = Emp 2's ID
    response = client.post(
        "/work-reports",
        data={
            "project_id": data["project_assigned"].id,
            "work_description": "Spoof employee_id attempt",
            "employee_id": data["employee2"].id,
        },
        headers=data["headers_emp1"],
    )

    assert response.status_code == 201
    res_data = response.json()
    # Verified: Report belongs strictly to Emp 1 derived from JWT
    assert res_data["employee_id"] == data["employee1"].id


def test_optional_attachment_works(db_session, test_setup_data, monkeypatch):
    from app.main import app
    client = TestClient(app)

    data = test_setup_data

    # Mock Cloudinary upload_document to avoid live network call during unit test
    def mock_upload_document(file_bytes, filename, folder):
        return {
            "url": "https://res.cloudinary.com/demo/image/upload/sample.pdf",
            "public_id": "hrms/work_reports/sample_pdf_id",
            "filename": filename,
        }

    monkeypatch.setattr("app.work_report_service.service.upload_document", mock_upload_document)

    file_content = b"%PDF-1.4 test document content"
    files = {"document": ("test_report.pdf", io.BytesIO(file_content), "application/pdf")}

    response = client.post(
        "/work-reports",
        data={
            "project_id": data["project_assigned"].id,
            "work_description": "Report with PDF attachment",
        },
        files=files,
        headers=data["headers_emp1"],
    )

    assert response.status_code == 201
    res_data = response.json()
    assert res_data["document_name"] == "test_report.pdf"
    assert res_data["document_url"] == "https://res.cloudinary.com/demo/image/upload/sample.pdf"


def test_invalid_attachment_extension_fails(db_session, test_setup_data):
    from app.main import app
    client = TestClient(app)

    data = test_setup_data

    file_content = b"malicious executable code"
    files = {"document": ("script.exe", io.BytesIO(file_content), "application/octet-stream")}

    response = client.post(
        "/work-reports",
        data={
            "project_id": data["project_assigned"].id,
            "work_description": "Report with invalid attachment",
        },
        files=files,
        headers=data["headers_emp1"],
    )

    assert response.status_code == 400
    assert "Invalid file extension '.exe'" in response.json()["detail"]


def test_whitespace_only_description_fails(db_session, test_setup_data):
    from app.main import app
    client = TestClient(app)

    data = test_setup_data

    response = client.post(
        "/work-reports",
        data={
            "project_id": data["project_assigned"].id,
            "work_description": "   \n\t   ",
        },
        headers=data["headers_emp1"],
    )

    assert response.status_code == 422
