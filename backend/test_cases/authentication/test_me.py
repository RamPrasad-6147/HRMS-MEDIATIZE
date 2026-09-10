from fastapi.testclient import TestClient

from app.authentication_service.models import User, UserRole
from app.core.security import create_access_token
from app.main import app


client = TestClient(app)


def create_test_user(db, email, role):
    user = User(
        email=email,
        employee_id=None,
        role=role,
        is_active=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


def test_get_me_with_valid_token(db_session):
    user = create_test_user(
        db_session,
        "me_test@example.com",
        UserRole.EMPLOYEE,
    )

    token = create_access_token(
        user_id=user.id,
        role=user.role.value,
    )

    response = client.get(
        "/auth/me",
        headers={
            "Authorization": f"Bearer {token}",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["id"] == user.id
    assert data["email"] == "me_test@example.com"
    assert data["role"] == "EMPLOYEE"
    assert data["is_active"] is True


def test_get_me_without_token():
    response = client.get("/auth/me")

    assert response.status_code == 401


def test_get_me_with_invalid_token():
    response = client.get(
        "/auth/me",
        headers={
            "Authorization": "Bearer invalid-token",
        },
    )

    assert response.status_code == 401


from app.employee_service.models import Employee, EmploymentStatus


def test_get_me_returns_profile_name_and_photo(db_session):
    user = create_test_user(
        db_session,
        "employee_name_test@example.com",
        UserRole.EMPLOYEE,
    )

    employee = Employee(
        user_id=user.id,
        employee_code=f"EMP{user.id:04d}",
        first_name="John",
        last_name="Doe",
        profile_photo_url="https://res.cloudinary.com/test/photo.png",
        employment_status=EmploymentStatus.ACTIVE,
    )
    db_session.add(employee)
    db_session.commit()

    token = create_access_token(
        user_id=user.id,
        role=user.role.value,
    )

    response = client.get(
        "/auth/me",
        headers={
            "Authorization": f"Bearer {token}",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["first_name"] == "John"
    assert data["last_name"] == "Doe"
    assert data["profile_photo_url"] == "https://res.cloudinary.com/test/photo.png"


def test_get_me_for_hr(db_session):
    user = create_test_user(
        db_session,
        "hr_me_test@example.com",
        UserRole.HR,
    )

    token = create_access_token(
        user_id=user.id,
        role=user.role.value,
    )

    response = client.get(
        "/auth/me",
        headers={
            "Authorization": f"Bearer {token}",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["email"] == "hr_me_test@example.com"
    assert data["role"] == "HR"
    assert data["first_name"] == "Mohan"
    assert data["last_name"] == "Medisetti"