import io
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.authentication_service.models import User, UserRole
from app.core.security import create_access_token
from app.employee_service.models import Employee, EmploymentStatus
from app.complaint_service.models import Complaint, ComplaintCategory, ComplaintPriority, ComplaintStatus


@pytest.fixture
def test_complaint_setup(db_session):
    """
    Setup helper fixture creating test HR user, test Employee 1, test Employee 2, and test categories.
    """
    # 1. HR User
    hr_user = db_session.scalar(select(User).where(User.email == "hr.complaint@example.com"))
    if not hr_user:
        hr_user = User(
            email="hr.complaint@example.com",
            role=UserRole.HR,
            is_active=True,
        )
        db_session.add(hr_user)

    # 2. Employee User 1 & Employee 1
    emp_user1 = db_session.scalar(select(User).where(User.email == "emp1.complaint@example.com"))
    if not emp_user1:
        emp_user1 = User(
            email="emp1.complaint@example.com",
            role=UserRole.EMPLOYEE,
            is_active=True,
        )
        db_session.add(emp_user1)

    # 3. Employee User 2 & Employee 2
    emp_user2 = db_session.scalar(select(User).where(User.email == "emp2.complaint@example.com"))
    if not emp_user2:
        emp_user2 = User(
            email="emp2.complaint@example.com",
            role=UserRole.EMPLOYEE,
            is_active=True,
        )
        db_session.add(emp_user2)

    db_session.flush()

    employee1 = db_session.scalar(select(Employee).where(Employee.user_id == emp_user1.id))
    if not employee1:
        employee1 = Employee(
            user_id=emp_user1.id,
            employee_code="CMP_EMP_001",
            first_name="Charlie",
            last_name="Grievance",
            employment_status=EmploymentStatus.ACTIVE,
        )
        db_session.add(employee1)

    employee2 = db_session.scalar(select(Employee).where(Employee.user_id == emp_user2.id))
    if not employee2:
        employee2 = Employee(
            user_id=emp_user2.id,
            employee_code="CMP_EMP_002",
            first_name="David",
            last_name="Grievance",
            employment_status=EmploymentStatus.ACTIVE,
        )
        db_session.add(employee2)

    db_session.flush()

    # 4. Active Category & Inactive Category
    active_cat = db_session.scalar(select(ComplaintCategory).where(ComplaintCategory.name == "WORKPLACE"))
    if not active_cat:
        active_cat = ComplaintCategory(
            name="WORKPLACE",
            description="Workplace environment grievances",
            is_active=True,
        )
        db_session.add(active_cat)

    inactive_cat = db_session.scalar(select(ComplaintCategory).where(ComplaintCategory.name == "INACTIVE_TEST_CAT"))
    if not inactive_cat:
        inactive_cat = ComplaintCategory(
            name="INACTIVE_TEST_CAT",
            description="Legacy inactive category",
            is_active=False,
        )
        db_session.add(inactive_cat)

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
        "active_cat": active_cat,
        "inactive_cat": inactive_cat,
        "headers_emp1": headers_emp1,
        "headers_emp2": headers_emp2,
        "headers_hr": headers_hr,
    }


def test_authenticated_employee_can_submit_complaint(db_session, test_complaint_setup):
    from app.main import app
    client = TestClient(app)

    data = test_complaint_setup
    response = client.post(
        "/complaints",
        data={
            "category_id": data["active_cat"].id,
            "subject": "Noise disruption in office",
            "description": "High noise levels in building B near desk 402 affecting work focus.",
            "priority": "HIGH",
        },
        headers=data["headers_emp1"],
    )

    assert response.status_code == 201
    res = response.json()
    assert res["subject"] == "Noise disruption in office"
    assert res["status"] == "OPEN"
    assert res["priority"] == "HIGH"
    assert res["employee_id"] == data["employee1"].id
    assert res["complaint_code"].startswith("CMP")


def test_unauthenticated_user_cannot_submit_complaint():
    from app.main import app
    client = TestClient(app)

    response = client.post(
        "/complaints",
        data={
            "category_id": 1,
            "subject": "Unauthenticated test",
            "description": "Valid description length test",
        },
    )

    assert response.status_code == 401


def test_inactive_category_cannot_be_selected(db_session, test_complaint_setup):
    from app.main import app
    client = TestClient(app)

    data = test_complaint_setup
    response = client.post(
        "/complaints",
        data={
            "category_id": data["inactive_cat"].id,
            "subject": "Test inactive category",
            "description": "Attempting to select inactive category",
        },
        headers=data["headers_emp1"],
    )

    assert response.status_code == 400
    assert "inactive and cannot be chosen" in response.json()["detail"]


def test_employee_cannot_view_another_employee_complaint(db_session, test_complaint_setup):
    from app.main import app
    client = TestClient(app)

    data = test_complaint_setup

    # Emp 2 submits complaint
    create_res = client.post(
        "/complaints",
        data={
            "category_id": data["active_cat"].id,
            "subject": "Emp 2 private complaint",
            "description": "Confidential matter belonging to Employee 2",
        },
        headers=data["headers_emp2"],
    )
    complaint_id = create_res.json()["id"]

    # Emp 1 tries to view Emp 2's complaint (IDOR check)
    response = client.get(
        f"/complaints/my/{complaint_id}",
        headers=data["headers_emp1"],
    )

    assert response.status_code == 403
    assert "Access denied" in response.json()["detail"]


def test_employee_cannot_access_hr_endpoints(db_session, test_complaint_setup):
    from app.main import app
    client = TestClient(app)

    data = test_complaint_setup

    # Emp 1 tries HR endpoints
    res1 = client.get("/complaints", headers=data["headers_emp1"])
    assert res1.status_code == 403

    res2 = client.get("/complaints/categories", headers=data["headers_emp1"])
    assert res2.status_code == 403


def test_employee_cannot_override_employee_id_or_status(db_session, test_complaint_setup):
    from app.main import app
    client = TestClient(app)

    data = test_complaint_setup

    response = client.post(
        "/complaints",
        data={
            "category_id": data["active_cat"].id,
            "subject": "Spoofing attempt",
            "description": "Attempting to set employee_id and status to RESOLVED",
            "employee_id": data["employee2"].id,
            "status": "RESOLVED",
        },
        headers=data["headers_emp1"],
    )

    assert response.status_code == 201
    res = response.json()
    assert res["employee_id"] == data["employee1"].id
    assert res["status"] == "OPEN"


def test_hr_can_view_all_complaints_and_filter(db_session, test_complaint_setup):
    from app.main import app
    client = TestClient(app)

    data = test_complaint_setup

    # Emp 1 submits complaint
    client.post(
        "/complaints",
        data={
            "category_id": data["active_cat"].id,
            "subject": "HR inspection test complaint",
            "description": "Details for HR inspection",
        },
        headers=data["headers_emp1"],
    )

    response = client.get("/complaints", headers=data["headers_hr"])
    assert response.status_code == 200
    res = response.json()
    assert res["total"] >= 1
    assert len(res["items"]) >= 1


def test_invalid_status_transitions_fail(db_session, test_complaint_setup):
    from app.main import app
    client = TestClient(app)

    data = test_complaint_setup

    # Submit complaint (starts in OPEN status)
    create_res = client.post(
        "/complaints",
        data={
            "category_id": data["active_cat"].id,
            "subject": "Status transition test",
            "description": "Testing forbidden status jumps",
        },
        headers=data["headers_emp1"],
    )
    cid = create_res.json()["id"]

    # Try OPEN -> RESOLVED (invalid)
    res1 = client.patch(
        f"/complaints/{cid}/status",
        json={"status": "RESOLVED"},
        headers=data["headers_hr"],
    )
    assert res1.status_code == 400
    assert "Invalid status transition" in res1.json()["detail"]

    # Try OPEN -> CLOSED (invalid)
    res2 = client.patch(
        f"/complaints/{cid}/status",
        json={"status": "CLOSED"},
        headers=data["headers_hr"],
    )
    assert res2.status_code == 400


def test_valid_status_flow_and_hr_actions(db_session, test_complaint_setup):
    from app.main import app
    client = TestClient(app)

    data = test_complaint_setup

    # 1. Employee submits
    c_res = client.post(
        "/complaints",
        data={
            "category_id": data["active_cat"].id,
            "subject": "Full lifecycle test",
            "description": "Testing OPEN -> UNDER_REVIEW -> IN_PROGRESS -> RESOLVED -> CLOSED",
        },
        headers=data["headers_emp1"],
    )
    cid = c_res.json()["id"]

    # 2. HR responds (auto advances to UNDER_REVIEW)
    resp_res = client.patch(
        f"/complaints/{cid}/respond",
        json={"hr_response": "We have received your grievance and assigned an investigator."},
        headers=data["headers_hr"],
    )
    assert resp_res.status_code == 200
    assert resp_res.json()["status"] == "UNDER_REVIEW"
    assert resp_res.json()["hr_response"] == "We have received your grievance and assigned an investigator."

    # 3. HR advances to IN_PROGRESS
    st1_res = client.patch(
        f"/complaints/{cid}/status",
        json={"status": "IN_PROGRESS"},
        headers=data["headers_hr"],
    )
    assert st1_res.status_code == 200
    assert st1_res.json()["status"] == "IN_PROGRESS"

    # 4. HR resolves
    res_res = client.patch(
        f"/complaints/{cid}/resolve",
        json={"resolution": "Adjusted air conditioning and acoustic paneling in office area."},
        headers=data["headers_hr"],
    )
    assert res_res.status_code == 200
    assert res_res.json()["status"] == "RESOLVED"
    assert res_res.json()["resolution"] == "Adjusted air conditioning and acoustic paneling in office area."
    assert res_res.json()["resolved_at"] is not None

    # 5. HR closes
    close_res = client.patch(
        f"/complaints/{cid}/close",
        headers=data["headers_hr"],
    )
    assert close_res.status_code == 200
    assert close_res.json()["status"] == "CLOSED"
    assert close_res.json()["closed_at"] is not None


def test_invalid_attachment_extension_fails(db_session, test_complaint_setup):
    from app.main import app
    client = TestClient(app)

    data = test_complaint_setup

    file_content = b"unauthorized code"
    files = {"attachment": ("virus.bat", io.BytesIO(file_content), "application/x-msdos-program")}

    response = client.post(
        "/complaints",
        data={
            "category_id": data["active_cat"].id,
            "subject": "Bad attachment test",
            "description": "Valid complaint description length",
        },
        files=files,
        headers=data["headers_emp1"],
    )

    assert response.status_code == 400
    assert "File format '.bat' is not supported" in response.json()["detail"]
