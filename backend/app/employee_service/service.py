from datetime import datetime, timezone
import math
import re
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.audit_service.models import AuditAction
from app.audit_service.service import create_audit_log
from app.authentication_service.models import User, UserRole
from app.core.config import settings
from app.email_service.service import send_employee_welcome_email
from app.employee_service.models import Employee, EmploymentStatus
from app.employee_service.schemas import (
    EmployeeCreate,
    EmployeeSelfUpdate,
    EmployeeUpdate,
)


# ============================================================
# Safe Employee Code Generator
# ============================================================

def generate_next_employee_code(db: Session) -> str:
    """
    Generate a unique, backend-controlled employee code
    (EMP001, EMP002, ...).

    The highest numeric suffix is calculated across both
    employees and users tables to avoid collisions.
    """

    employee_codes = db.scalars(
        select(Employee.employee_code).where(
            Employee.employee_code.like("EMP%")
        )
    ).all()

    user_employee_ids = db.scalars(
        select(User.employee_id).where(
            User.employee_id.like("EMP%")
        )
    ).all()

    all_codes = list(employee_codes) + [
        code for code in user_employee_ids if code
    ]

    max_num = 0
    pattern = re.compile(r"^EMP(\d+)$", re.IGNORECASE)

    for code in all_codes:
        match = pattern.match(code)

        if match:
            num = int(match.group(1))

            if num > max_num:
                max_num = num

    next_num = max_num + 1

    return f"EMP{next_num:03d}"


# ============================================================
# Create Employee (HR Only)
# ============================================================

def create_employee(
    db: Session,
    data: EmployeeCreate,
    hr_user_id: int,
    ip_address: Optional[str] = None,
) -> Employee:
    """
    Create a new employee profile and corresponding User account
    in a single database transaction.

    Authentication is passwordless. No password is generated,
    stored, hashed, or emailed.

    The employee receives a welcome email explaining that login
    is performed using their registered email address and a
    one-time OTP.
    """

    # --------------------------------------------------------
    # 1. Validate email uniqueness
    # --------------------------------------------------------

    existing_user = db.scalar(
        select(User).where(User.email == data.email)
    )

    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email address already exists.",
        )

    # --------------------------------------------------------
    # 2. Generate Employee Code
    # --------------------------------------------------------

    employee_code = generate_next_employee_code(db)

    # --------------------------------------------------------
    # 3. Create User record
    # --------------------------------------------------------

    user = User(
        email=data.email,
        employee_id=employee_code,
        role=UserRole.EMPLOYEE,
        is_active=True,
    )

    db.add(user)
    db.flush()

    # --------------------------------------------------------
    # 4. Create Employee profile
    # --------------------------------------------------------

    employee = Employee(
        user_id=user.id,
        employee_code=employee_code,
        first_name=data.first_name,
        last_name=data.last_name,
        phone=data.phone,
        date_of_birth=data.date_of_birth,
        address=data.address,
        joining_date=data.joining_date,
        department_id=data.department_id,
        designation_id=data.designation_id,
        employment_status=EmploymentStatus.ACTIVE,
    )

    db.add(employee)

    # --------------------------------------------------------
    # 5. Commit database transaction
    # --------------------------------------------------------

    db.commit()
    db.refresh(employee)

    # --------------------------------------------------------
    # 6. Send OTP-only welcome email
    # --------------------------------------------------------

    try:
        login_url = (
            f"{settings.FRONTEND_URL.rstrip('/')}/login"
        )

        full_name = (
            f"{data.first_name} {data.last_name}"
        ).strip()

        send_employee_welcome_email(
            recipient_email=data.email,
            employee_name=full_name,
            login_url=login_url,
            employee_code=employee_code,
        )

    except Exception as exc:
        # The employee record has already been committed.
        # Email failure must not roll back the employee creation.
        print(
            f"[Warning] Welcome email sending failed "
            f"for {data.email}: {exc}"
        )

    return employee


# ============================================================
# Get Employee by ID
# ============================================================

def get_employee_by_id(
    db: Session,
    employee_id: int,
) -> Employee:
    """
    Retrieve an active/non-archived employee profile by ID.
    """

    statement = select(Employee).where(
        Employee.id == employee_id,
        Employee.deleted_at.is_(None),
    )

    employee = db.scalar(statement)

    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
        )

    return employee


# ============================================================
# Get Employee by User ID
# ============================================================

def get_employee_by_user_id(
    db: Session,
    user_id: int,
) -> Employee:
    """
    Retrieve an active/non-archived employee profile by
    associated User ID.
    """

    statement = select(Employee).where(
        Employee.user_id == user_id,
        Employee.deleted_at.is_(None),
    )

    employee = db.scalar(statement)

    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee profile not found",
        )

    return employee


# ============================================================
# List Employees
# ============================================================

def list_employees(
    db: Session,
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    department_id: Optional[int] = None,
    designation_id: Optional[int] = None,
    employment_status: Optional[EmploymentStatus] = None,
) -> dict:
    """
    List non-archived employees with searching,
    filtering, and pagination.
    """

    if page < 1:
        page = 1

    if limit < 1:
        limit = 20

    if limit > 100:
        limit = 100

    query = (
        select(Employee)
        .join(Employee.user)
        .where(Employee.deleted_at.is_(None))
    )

    # --------------------------------------------------------
    # Filters
    # --------------------------------------------------------

    if department_id is not None:
        query = query.where(
            Employee.department_id == department_id
        )

    if designation_id is not None:
        query = query.where(
            Employee.designation_id == designation_id
        )

    if employment_status is not None:
        query = query.where(
            Employee.employment_status == employment_status
        )

    # --------------------------------------------------------
    # Search
    # --------------------------------------------------------

    if search:
        search_pattern = f"%{search.strip()}%"

        query = query.where(
            or_(
                Employee.employee_code.ilike(search_pattern),
                Employee.first_name.ilike(search_pattern),
                Employee.last_name.ilike(search_pattern),
                User.email.ilike(search_pattern),
            )
        )

    # --------------------------------------------------------
    # Count
    # --------------------------------------------------------

    count_statement = select(
        func.count()
    ).select_from(
        query.subquery()
    )

    total = db.scalar(count_statement) or 0

    # --------------------------------------------------------
    # Pagination
    # --------------------------------------------------------

    offset = (page - 1) * limit

    items_statement = (
        query
        .order_by(Employee.id.desc())
        .offset(offset)
        .limit(limit)
    )

    items = db.scalars(
        items_statement
    ).unique().all()

    total_pages = (
        math.ceil(total / limit)
        if total > 0
        else 1
    )

    return {
        "items": items,
        "page": page,
        "limit": limit,
        "total": total,
        "total_pages": total_pages,
    }


# ============================================================
# Update Employee (HR Only)
# ============================================================

def update_employee(
    db: Session,
    employee_id: int,
    data: EmployeeUpdate,
) -> Employee:
    """
    Update employee profile fields.

    HR can update personal details, email, department,
    designation, and employment status.
    """

    employee = get_employee_by_id(
        db,
        employee_id,
    )

    # --------------------------------------------------------
    # Update email
    # --------------------------------------------------------

    if data.email and data.email != employee.user.email:

        existing_user = db.scalar(
            select(User).where(
                User.email == data.email,
                User.id != employee.user_id,
            )
        )

        if existing_user is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "A user with this email address "
                    "already exists."
                ),
            )

        employee.user.email = data.email

    # --------------------------------------------------------
    # Personal and business fields
    # --------------------------------------------------------

    if data.first_name is not None:
        employee.first_name = data.first_name

    if data.last_name is not None:
        employee.last_name = data.last_name

    if data.phone is not None:
        employee.phone = data.phone

    if data.date_of_birth is not None:
        employee.date_of_birth = data.date_of_birth

    if data.address is not None:
        employee.address = data.address

    if data.joining_date is not None:
        employee.joining_date = data.joining_date

    if data.department_id is not None:
        employee.department_id = data.department_id

    if data.designation_id is not None:
        employee.designation_id = data.designation_id

    # --------------------------------------------------------
    # Employment status / account status synchronization
    # --------------------------------------------------------

    if data.employment_status is not None:

        employee.employment_status = data.employment_status

        if data.employment_status in (
            EmploymentStatus.INACTIVE,
            EmploymentStatus.TERMINATED,
        ):
            employee.user.is_active = False

        elif data.employment_status == EmploymentStatus.ACTIVE:
            employee.user.is_active = True

    employee.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(employee)

    return employee


# ============================================================
# Activate Employee
# ============================================================

def activate_employee(
    db: Session,
    employee_id: int,
) -> Employee:
    """
    Activate an employee account.

    Sets employment_status=ACTIVE and user.is_active=True.
    """

    employee = get_employee_by_id(
        db,
        employee_id,
    )

    employee.employment_status = EmploymentStatus.ACTIVE
    employee.user.is_active = True
    employee.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(employee)

    return employee


# ============================================================
# Deactivate Employee
# ============================================================

def deactivate_employee(
    db: Session,
    employee_id: int,
    ip_address: Optional[str] = None,
) -> Employee:
    """
    Deactivate an employee account.

    Sets employment_status=INACTIVE and user.is_active=False.
    Logs an audit event.
    """

    employee = get_employee_by_id(
        db,
        employee_id,
    )

    employee.employment_status = EmploymentStatus.INACTIVE
    employee.user.is_active = False
    employee.updated_at = datetime.now(timezone.utc)

    create_audit_log(
        db,
        action=AuditAction.ACCOUNT_DEACTIVATED,
        user_id=employee.user_id,
        ip_address=ip_address,
    )

    db.commit()
    db.refresh(employee)

    return employee


# ============================================================
# Archive Employee
# ============================================================

def archive_employee(
    db: Session,
    employee_id: int,
) -> Employee:
    """
    Soft-delete an employee record.

    The employee remains in the database but is archived and
    their User account is deactivated so OTP authentication
    cannot be performed.
    """

    statement = select(Employee).where(
        Employee.id == employee_id
    )

    employee = db.scalar(statement)

    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
        )

    now = datetime.now(timezone.utc)

    employee.deleted_at = now
    employee.employment_status = EmploymentStatus.INACTIVE

    if employee.user:
        employee.user.is_active = False

    employee.updated_at = now

    db.commit()
    db.refresh(employee)

    return employee


# ============================================================
# Update Self Profile
# ============================================================

def update_self_profile(
    db: Session,
    user_id: int,
    data: EmployeeSelfUpdate,
) -> Employee:
    """
    Allow an authenticated employee to update allowed
    self-service personal fields.
    """

    employee = get_employee_by_user_id(
        db,
        user_id,
    )

    if data.phone is not None:
        employee.phone = data.phone

    if data.address is not None:
        employee.address = data.address

    employee.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(employee)

    return employee