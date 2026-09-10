from datetime import date
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.authentication_service.models import User, UserRole
from app.core.security import create_access_token
from app.employee_service.models import Employee, EmploymentStatus
from app.performance_service.models import GoalStatus, PerformanceGoal, PerformanceReview, ReviewStatus
from app.main import app


@pytest.fixture
def test_performance_setup(db_session):
    """
    Fixture creating HR User, Employee User 1, and Employee User 2.
    """
    # 1. HR User
    hr_user = db_session.scalar(select(User).where(User.email == "hr.perf@example.com"))
    if not hr_user:
        hr_user = User(
            email="hr.perf@example.com",
            role=UserRole.HR,
            is_active=True,
        )
        db_session.add(hr_user)

    # 2. Employee User 1
    emp_user1 = db_session.scalar(select(User).where(User.email == "emp1.perf@example.com"))
    if not emp_user1:
        emp_user1 = User(
            email="emp1.perf@example.com",
            role=UserRole.EMPLOYEE,
            is_active=True,
        )
        db_session.add(emp_user1)

    # 3. Employee User 2
    emp_user2 = db_session.scalar(select(User).where(User.email == "emp2.perf@example.com"))
    if not emp_user2:
        emp_user2 = User(
            email="emp2.perf@example.com",
            role=UserRole.EMPLOYEE,
            is_active=True,
        )
        db_session.add(emp_user2)

    db_session.flush()

    employee1 = db_session.scalar(select(Employee).where(Employee.user_id == emp_user1.id))
    if not employee1:
        employee1 = Employee(
            user_id=emp_user1.id,
            employee_code="PRF_EMP_001",
            first_name="Alice",
            last_name="Performer",
            employment_status=EmploymentStatus.ACTIVE,
        )
        db_session.add(employee1)

    employee2 = db_session.scalar(select(Employee).where(Employee.user_id == emp_user2.id))
    if not employee2:
        employee2 = Employee(
            user_id=emp_user2.id,
            employee_code="PRF_EMP_002",
            first_name="Bob",
            last_name="Performer",
            employment_status=EmploymentStatus.ACTIVE,
        )
        db_session.add(employee2)

    db_session.commit()

    hr_token = create_access_token(hr_user.id, hr_user.role.value)
    emp1_token = create_access_token(emp_user1.id, emp_user1.role.value)
    emp2_token = create_access_token(emp_user2.id, emp_user2.role.value)

    return {
        "hr_user": hr_user,
        "hr_headers": {"Authorization": f"Bearer {hr_token}"},
        "emp1_user": emp_user1,
        "emp1_id": employee1.id,
        "emp1_headers": {"Authorization": f"Bearer {emp1_token}"},
        "emp2_user": emp_user2,
        "emp2_id": employee2.id,
        "emp2_headers": {"Authorization": f"Bearer {emp2_token}"},
    }


def test_authenticated_hr_can_create_draft_review(db_session, test_performance_setup):
    client = TestClient(app)
    setup = test_performance_setup

    payload = {
        "employee_id": setup["emp1_id"],
        "review_start_date": "2026-07-01",
        "review_end_date": "2026-09-30",
        "overall_feedback": "Initial draft review notes",
        "ratings": [
            {"category": "Technical Skills", "rating": 4, "comments": "Good"},
            {"category": "Work Quality", "rating": 5, "comments": "Excellent"},
        ],
    }

    res = client.post("/performance/reviews", json=payload, headers=setup["hr_headers"])
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "DRAFT"
    assert data["employee_id"] == setup["emp1_id"]
    assert len(data["ratings"]) == 2


def test_hr_can_complete_review_and_calculate_overall_rating(db_session, test_performance_setup):
    client = TestClient(app)
    setup = test_performance_setup

    # Create draft
    payload = {
        "employee_id": setup["emp1_id"],
        "review_start_date": "2026-07-01",
        "review_end_date": "2026-09-30",
        "ratings": [
            {"category": "Category A", "rating": 4},
            {"category": "Category B", "rating": 5},
        ],
    }
    create_res = client.post("/performance/reviews", json=payload, headers=setup["hr_headers"])
    review_id = create_res.json()["id"]

    # Complete review
    complete_res = client.patch(f"/performance/reviews/{review_id}/complete", headers=setup["hr_headers"])
    assert complete_res.status_code == 200
    data = complete_res.json()
    assert data["status"] == "COMPLETED"
    assert data["overall_rating"] == 4.5  # (4 + 5) / 2 = 4.5
    assert data["completed_at"] is not None


def test_employee_cannot_view_draft_review(db_session, test_performance_setup):
    client = TestClient(app)
    setup = test_performance_setup

    # Create draft
    payload = {
        "employee_id": setup["emp1_id"],
        "review_start_date": "2026-07-01",
        "review_end_date": "2026-09-30",
        "ratings": [{"category": "Skills", "rating": 3}],
    }
    create_res = client.post("/performance/reviews", json=payload, headers=setup["hr_headers"])
    review_id = create_res.json()["id"]

    # Employee tries to get draft review
    get_res = client.get(f"/performance/my/reviews/{review_id}", headers=setup["emp1_headers"])
    assert get_res.status_code in [403, 404]


def test_employee_can_view_own_completed_review(db_session, test_performance_setup):
    client = TestClient(app)
    setup = test_performance_setup

    # Create & Complete review
    payload = {
        "employee_id": setup["emp1_id"],
        "review_start_date": "2026-07-01",
        "review_end_date": "2026-09-30",
        "ratings": [{"category": "Skills", "rating": 4}],
    }
    create_res = client.post("/performance/reviews", json=payload, headers=setup["hr_headers"])
    review_id = create_res.json()["id"]
    client.patch(f"/performance/reviews/{review_id}/complete", headers=setup["hr_headers"])

    # Employee views completed review
    get_res = client.get(f"/performance/my/reviews/{review_id}", headers=setup["emp1_headers"])
    assert get_res.status_code == 200
    assert get_res.json()["overall_rating"] == 4.0


def test_idor_protection_employee_cannot_access_another_employee_review(db_session, test_performance_setup):
    client = TestClient(app)
    setup = test_performance_setup

    # HR creates review for Employee 1
    payload = {
        "employee_id": setup["emp1_id"],
        "review_start_date": "2026-07-01",
        "review_end_date": "2026-09-30",
        "ratings": [{"category": "Skills", "rating": 5}],
    }
    create_res = client.post("/performance/reviews", json=payload, headers=setup["hr_headers"])
    review_id = create_res.json()["id"]
    client.patch(f"/performance/reviews/{review_id}/complete", headers=setup["hr_headers"])

    # Employee 2 attempts to view Employee 1's review
    get_res = client.get(f"/performance/my/reviews/{review_id}", headers=setup["emp2_headers"])
    assert get_res.status_code in [403, 404]


def test_employee_cannot_access_hr_endpoints(db_session, test_performance_setup):
    client = TestClient(app)
    setup = test_performance_setup

    res = client.get("/performance/dashboard", headers=setup["emp1_headers"])
    assert res.status_code == 403

    payload = {
        "employee_id": setup["emp1_id"],
        "review_start_date": "2026-07-01",
        "review_end_date": "2026-09-30",
        "ratings": [{"category": "Skills", "rating": 3}],
    }
    create_res = client.post("/performance/reviews", json=payload, headers=setup["emp1_headers"])
    assert create_res.status_code == 403


def test_hr_can_create_and_update_performance_goal(db_session, test_performance_setup):
    client = TestClient(app)
    setup = test_performance_setup

    goal_payload = {
        "employee_id": setup["emp1_id"],
        "title": "Complete Module 10",
        "description": "Build Performance and Analytics module",
        "target_date": "2026-09-30",
        "progress_percentage": 50,
        "status": "IN_PROGRESS",
    }
    res = client.post("/performance/goals", json=goal_payload, headers=setup["hr_headers"])
    assert res.status_code == 201
    goal_data = res.json()
    assert goal_data["title"] == "Complete Module 10"
    assert goal_data["progress_percentage"] == 50

    # Update goal
    update_payload = {"progress_percentage": 100, "status": "COMPLETED"}
    up_res = client.put(f"/performance/goals/{goal_data['id']}", json=update_payload, headers=setup["hr_headers"])
    assert up_res.status_code == 200
    assert up_res.json()["status"] == "COMPLETED"


def test_employee_can_update_own_goal_status(db_session, test_performance_setup):
    client = TestClient(app)
    setup = test_performance_setup

    goal_payload = {
        "employee_id": setup["emp1_id"],
        "title": "Learn FastAPI Performance",
        "target_date": "2026-09-30",
        "progress_percentage": 0,
        "status": "NOT_STARTED",
    }
    create_res = client.post("/performance/goals", json=goal_payload, headers=setup["hr_headers"])
    goal_id = create_res.json()["id"]

    # Employee updates status
    patch_res = client.patch(
        f"/performance/my/goals/{goal_id}/status",
        json={"status": "IN_PROGRESS", "progress_percentage": 30},
        headers=setup["emp1_headers"],
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["progress_percentage"] == 30


def test_employee_performance_summary_and_metrics(db_session, test_performance_setup):
    client = TestClient(app)
    setup = test_performance_setup

    res = client.get("/performance/my/summary", headers=setup["emp1_headers"])
    assert res.status_code == 200
    data = res.json()
    assert "latest_rating" in data
    assert "projects" in data
    assert "tasks" in data
    assert "work_reports" in data
    assert "attendance" in data
    assert "leave" in data


def test_hr_performance_dashboard(db_session, test_performance_setup):
    client = TestClient(app)
    setup = test_performance_setup

    res = client.get("/performance/dashboard", headers=setup["hr_headers"])
    assert res.status_code == 200
    data = res.json()
    assert "total_employees" in data
    assert "reviews_completed" in data
    assert "reviews_pending" in data
    assert "goals_completed" in data


def test_hr_performance_analytics(db_session, test_performance_setup):
    client = TestClient(app)
    setup = test_performance_setup

    res = client.get("/performance/analytics", headers=setup["hr_headers"])
    assert res.status_code == 200
    data = res.json()
    assert "ratings_by_employee" in data
    assert "performance_trends" in data
    assert "goal_status_distribution" in data
    assert "category_ratings" in data
    assert "review_status_distribution" in data

