from datetime import datetime, timezone
from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    Query,
    Request,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.authentication_service.dependencies import (
    get_current_hr,
    get_current_user,
)
from app.authentication_service.models import User
from app.cloudinary_service import service as cloudinary_service
from app.core.database import get_db
from app.employee_service import service
from app.employee_service.models import EmploymentStatus
from app.employee_service.schemas import (
    EmployeeCreate,
    EmployeeListResponse,
    EmployeeResponse,
    EmployeeSelfUpdate,
    EmployeeUpdate,
    format_employee_response,
)

router = APIRouter(
    prefix="/employees",
    tags=["Employee Management"],
)


# ============================================================
# Create Employee (HR Only)
# ============================================================

@router.post(
    "",
    response_model=EmployeeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Employee (HR Only)",
)
def create_employee_endpoint(
    data: EmployeeCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_hr: User = Depends(get_current_hr),
):
    ip_address = request.client.host if request.client else None

    employee = service.create_employee(
        db=db,
        data=data,
        hr_user_id=current_hr.id,
        ip_address=ip_address,
    )

    return format_employee_response(employee)


# ============================================================
# List Employees (HR Only)
# ============================================================

@router.get(
    "",
    response_model=EmployeeListResponse,
    status_code=status.HTTP_200_OK,
    summary="List Employees (HR Only)",
)
def list_employees_endpoint(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    department_id: Optional[int] = Query(None),
    designation_id: Optional[int] = Query(None),
    employment_status: Optional[EmploymentStatus] = Query(None),
    db: Session = Depends(get_db),
    current_hr: User = Depends(get_current_hr),
):
    result = service.list_employees(
        db=db,
        page=page,
        limit=limit,
        search=search,
        department_id=department_id,
        designation_id=designation_id,
        employment_status=employment_status,
    )

    formatted_items = [
        format_employee_response(emp)
        for emp in result["items"]
    ]

    return {
        "items": formatted_items,
        "page": result["page"],
        "limit": result["limit"],
        "total": result["total"],
        "total_pages": result["total_pages"],
    }


# ============================================================
# View Own Profile (Employee Self Service)
# ============================================================

@router.get(
    "/me",
    response_model=EmployeeResponse,
    status_code=status.HTTP_200_OK,
    summary="View Own Employee Profile",
)
def get_my_profile_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    employee = service.get_employee_by_user_id(
        db=db,
        user_id=current_user.id,
    )

    return format_employee_response(employee)


# ============================================================
# Update Own Profile (Employee Self Service)
# ============================================================

@router.put(
    "/me",
    response_model=EmployeeResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Own Employee Profile",
)
def update_my_profile_endpoint(
    data: EmployeeSelfUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    employee = service.update_self_profile(
        db=db,
        user_id=current_user.id,
        data=data,
    )

    return format_employee_response(employee)


# ============================================================
# Get Employee Details by ID (HR Only)
# ============================================================

@router.get(
    "/{employee_id}",
    response_model=EmployeeResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Employee Details (HR Only)",
)
def get_employee_by_id_endpoint(
    employee_id: int,
    db: Session = Depends(get_db),
    current_hr: User = Depends(get_current_hr),
):
    employee = service.get_employee_by_id(
        db=db,
        employee_id=employee_id,
    )

    return format_employee_response(employee)


# ============================================================
# Update Employee Details by ID (HR Only)
# ============================================================

@router.put(
    "/{employee_id}",
    response_model=EmployeeResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Employee Details (HR Only)",
)
def update_employee_endpoint(
    employee_id: int,
    data: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_hr: User = Depends(get_current_hr),
):
    employee = service.update_employee(
        db=db,
        employee_id=employee_id,
        data=data,
    )

    return format_employee_response(employee)


# ============================================================
# Archive (Soft Delete) Employee (HR Only)
# ============================================================

@router.delete(
    "/{employee_id}",
    response_model=EmployeeResponse,
    status_code=status.HTTP_200_OK,
    summary="Archive Employee (HR Only)",
)
def archive_employee_endpoint(
    employee_id: int,
    db: Session = Depends(get_db),
    current_hr: User = Depends(get_current_hr),
):
    employee = service.archive_employee(
        db=db,
        employee_id=employee_id,
    )

    return format_employee_response(employee)


# ============================================================
# Activate Employee (HR Only)
# ============================================================

@router.patch(
    "/{employee_id}/activate",
    response_model=EmployeeResponse,
    status_code=status.HTTP_200_OK,
    summary="Activate Employee (HR Only)",
)
def activate_employee_endpoint(
    employee_id: int,
    db: Session = Depends(get_db),
    current_hr: User = Depends(get_current_hr),
):
    employee = service.activate_employee(
        db=db,
        employee_id=employee_id,
    )

    return format_employee_response(employee)


# ============================================================
# Deactivate Employee (HR Only)
# ============================================================

@router.patch(
    "/{employee_id}/deactivate",
    response_model=EmployeeResponse,
    status_code=status.HTTP_200_OK,
    summary="Deactivate Employee (HR Only)",
)
def deactivate_employee_endpoint(
    employee_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_hr: User = Depends(get_current_hr),
):
    ip_address = request.client.host if request.client else None

    employee = service.deactivate_employee(
        db=db,
        employee_id=employee_id,
        ip_address=ip_address,
    )

    return format_employee_response(employee)


# ============================================================
# Upload / Replace Own Profile Photo
# ============================================================

@router.post(
    "/me/profile-photo",
    response_model=EmployeeResponse,
    status_code=status.HTTP_200_OK,
    summary="Upload/Replace Own Profile Photo",
)
async def upload_my_profile_photo_endpoint(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    employee = service.get_employee_by_user_id(
        db=db,
        user_id=current_user.id,
    )

    file_bytes = await file.read()

    cloudinary_service.validate_image_file(
        file=file,
        file_bytes=file_bytes,
    )

    upload_result = cloudinary_service.replace_image(
        old_public_id=employee.profile_photo_public_id,
        new_file_bytes=file_bytes,
    )

    employee.profile_photo_url = upload_result["url"]
    employee.profile_photo_public_id = upload_result["public_id"]
    employee.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(employee)

    return format_employee_response(employee)


# ============================================================
# Remove Own Profile Photo
# ============================================================

@router.delete(
    "/me/profile-photo",
    response_model=EmployeeResponse,
    status_code=status.HTTP_200_OK,
    summary="Remove Own Profile Photo",
)
def remove_my_profile_photo_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    employee = service.get_employee_by_user_id(
        db=db,
        user_id=current_user.id,
    )

    if employee.profile_photo_public_id:
        cloudinary_service.delete_image(
            employee.profile_photo_public_id
        )

    employee.profile_photo_url = None
    employee.profile_photo_public_id = None
    employee.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(employee)

    return format_employee_response(employee)