import uuid
from datetime import date, timedelta
import pytest
from fastapi import status
from fastapi.testclient import TestClient

from app.main import app
from app.authentication_service.models import User, UserRole
from app.employee_service.models import Employee, EmploymentStatus
from app.core.security import create_access_token
from app.project_service.models import ProjectStatus


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def hr_user_and_token(db_session):
    unique_id = uuid.uuid4().hex[:8]
    user = User(
        email=f"hr_proj_{unique_id}@example.com",
        role=UserRole.HR,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    token = create_access_token(user_id=user.id, role=user.role.value)
    return user, token


@pytest.fixture
def emp_user_token_and_profile(db_session):
    unique_id = uuid.uuid4().hex[:8]
    user = User(
        email=f"emp_proj_{unique_id}@example.com",
        role=UserRole.EMPLOYEE,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    employee = Employee(
        user_id=user.id,
        employee_code=f"EMP{unique_id[:4].upper()}",
        first_name="Project",
        last_name="Tester",
        joining_date=date.today(),
        employment_status=EmploymentStatus.ACTIVE,
    )
    db_session.add(employee)
    db_session.commit()
    db_session.refresh(employee)

    token = create_access_token(user_id=user.id, role=user.role.value)
    return user, token, employee


# =========================================================
# PROJECT ROLE TESTS
# =========================================================
def test_create_and_list_project_roles(client, hr_user_and_token):
    _, hr_token = hr_user_and_token
    headers = {"Authorization": f"Bearer {hr_token}"}
    role_name = f"Custom Role {uuid.uuid4().hex[:6]}"
    response = client.post(
        "/project-roles",
        json={"name": role_name, "description": "Custom role description"},
        headers=headers,
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["name"] == role_name
    assert data["is_active"] is True

    # List roles
    get_res = client.get("/project-roles", headers=headers)
    assert get_res.status_code == status.HTTP_200_OK
    roles = get_res.json()
    assert len(roles) >= 11  # Initial seeded roles + custom role


def test_employee_cannot_create_project_role(client, emp_user_token_and_profile):
    _, emp_token, _ = emp_user_token_and_profile
    headers = {"Authorization": f"Bearer {emp_token}"}
    response = client.post(
        "/project-roles",
        json={"name": f"Hacker Role {uuid.uuid4().hex[:6]}"},
        headers=headers,
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN


# =========================================================
# PROJECT CREATION & VALIDATION TESTS
# =========================================================
def test_hr_create_project_success(client, hr_user_and_token):
    _, hr_token = hr_user_and_token
    headers = {"Authorization": f"Bearer {hr_token}"}
    today = date.today().isoformat()
    end_date = (date.today() + timedelta(days=90)).isoformat()

    payload = {
        "name": "HRMS Project Module",
        "description": "Full stack project management module development",
        "start_date": today,
        "end_date": end_date,
        "priority": "HIGH",
    }
    response = client.post("/projects", json=payload, headers=headers)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["name"] == "HRMS Project Module"
    assert data["project_code"].startswith("PRJ")
    assert data["status"] == "PLANNED"
    assert data["progress_percentage"] == 0


def test_create_project_invalid_dates(client, hr_user_and_token):
    _, hr_token = hr_user_and_token
    headers = {"Authorization": f"Bearer {hr_token}"}
    today = date.today().isoformat()
    past_date = (date.today() - timedelta(days=10)).isoformat()

    payload = {
        "name": "Invalid Date Project",
        "start_date": today,
        "end_date": past_date,
    }
    response = client.post("/projects", json=payload, headers=headers)
    assert response.status_code in (status.HTTP_422_UNPROCESSABLE_ENTITY, 422)


def test_employee_cannot_create_project(client, emp_user_token_and_profile):
    _, emp_token, _ = emp_user_token_and_profile
    headers = {"Authorization": f"Bearer {emp_token}"}
    payload = {
        "name": "Employee Unauthorized Project",
        "start_date": date.today().isoformat(),
    }
    response = client.post("/projects", json=payload, headers=headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN


# =========================================================
# PROJECT STATUS & PROGRESS TRANSITION TESTS
# =========================================================
def test_project_status_transitions(client, hr_user_and_token):
    _, hr_token = hr_user_and_token
    headers = {"Authorization": f"Bearer {hr_token}"}
    # Create project
    create_res = client.post(
        "/projects",
        json={"name": "Status Lifecycle Project", "start_date": date.today().isoformat()},
        headers=headers,
    )
    p_id = create_res.json()["id"]

    # Planned -> In Progress
    status_res = client.patch(f"/projects/{p_id}/status", json={"status": "IN_PROGRESS"}, headers=headers)
    assert status_res.status_code == status.HTTP_200_OK
    assert status_res.json()["status"] == "IN_PROGRESS"

    # Cannot mark COMPLETED while progress < 100
    comp_fail = client.patch(f"/projects/{p_id}/status", json={"status": "COMPLETED"}, headers=headers)
    assert comp_fail.status_code == status.HTTP_400_BAD_REQUEST

    # Update progress to 100
    prog_res = client.patch(f"/projects/{p_id}/progress", json={"progress_percentage": 100}, headers=headers)
    assert prog_res.status_code == status.HTTP_200_OK
    assert prog_res.json()["progress_percentage"] == 100

    # Mark COMPLETED now succeeds
    comp_success = client.patch(f"/projects/{p_id}/status", json={"status": "COMPLETED"}, headers=headers)
    assert comp_success.status_code == status.HTTP_200_OK
    assert comp_success.json()["status"] == "COMPLETED"


# =========================================================
# TEAM ASSIGNMENT & IDOR SECURITY TESTS
# =========================================================
def test_project_team_assignment_and_idor(client, hr_user_and_token, emp_user_token_and_profile):
    _, hr_token = hr_user_and_token
    _, emp_token, employee = emp_user_token_and_profile

    hr_headers = {"Authorization": f"Bearer {hr_token}"}
    emp_headers = {"Authorization": f"Bearer {emp_token}"}

    # 1. Create project as HR
    create_res = client.post(
        "/projects",
        json={"name": "Team Test Project", "start_date": date.today().isoformat()},
        headers=hr_headers,
    )
    p_id = create_res.json()["id"]

    # 2. Get role ID
    roles_res = client.get("/project-roles", headers=hr_headers)
    role_id = roles_res.json()[0]["id"]

    # 3. Before assignment: Employee IDOR check (Should fail with 403)
    idor_fail = client.get(f"/projects/my-projects/{p_id}", headers=emp_headers)
    assert idor_fail.status_code == status.HTTP_403_FORBIDDEN

    # 4. HR assigns employee
    assign_res = client.post(
        f"/projects/{p_id}/assignments",
        json={"employee_id": employee.id, "project_role_id": role_id},
        headers=hr_headers,
    )
    assert assign_res.status_code == status.HTTP_201_CREATED
    assignment_id = assign_res.json()["id"]

    # 5. Duplicate active assignment prevention
    dup_res = client.post(
        f"/projects/{p_id}/assignments",
        json={"employee_id": employee.id, "project_role_id": role_id},
        headers=hr_headers,
    )
    assert dup_res.status_code == status.HTTP_400_BAD_REQUEST

    # 6. After assignment: Employee self-service GET /projects/my-projects succeeds
    my_projects = client.get("/projects/my-projects", headers=emp_headers)
    assert my_projects.status_code == status.HTTP_200_OK
    assert len(my_projects.json()) >= 1

    # 7. Employee GET /projects/my-projects/{id} succeeds
    my_details = client.get(f"/projects/my-projects/{p_id}", headers=emp_headers)
    assert my_details.status_code == status.HTTP_200_OK
    assert my_details.json()["project"]["id"] == p_id

    # 8. HR Soft Removes Employee
    remove_res = client.patch(f"/projects/{p_id}/assignments/{assignment_id}/remove", headers=hr_headers)
    assert remove_res.status_code == status.HTTP_200_OK
    assert remove_res.json()["status"] == "REMOVED"

    # 9. After removal: IDOR check returns 403 Forbidden again
    post_remove_idor = client.get(f"/projects/my-projects/{p_id}", headers=emp_headers)
    assert post_remove_idor.status_code == status.HTTP_403_FORBIDDEN


def test_hr_dashboard_metrics(client, hr_user_and_token):
    _, hr_token = hr_user_and_token
    headers = {"Authorization": f"Bearer {hr_token}"}
    response = client.get("/projects/metrics", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "total_projects" in data
    assert "active_projects" in data
    assert "completed_projects" in data
    assert "overdue_projects" in data
