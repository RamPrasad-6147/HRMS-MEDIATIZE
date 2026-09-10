from datetime import date
from typing import List, Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
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
from app.complaint_service import service
from app.complaint_service.models import ComplaintPriority, ComplaintStatus
from app.complaint_service.schemas import (
    ComplaintCategoryCreate,
    ComplaintCategoryResponse,
    ComplaintCategoryUpdate,
    ComplaintPriorityUpdate,
    ComplaintRespondRequest,
    ComplaintResponse,
    ComplaintResolveRequest,
    ComplaintStatusUpdate,
    PaginatedComplaintResponse,
)
from app.core.database import get_db

router = APIRouter(prefix="/complaints", tags=["Complaint Management"])


# ============================================================
# EMPLOYEE ENDPOINTS
# ============================================================

@router.get(
    "/active-categories",
    response_model=List[ComplaintCategoryResponse],
    status_code=status.HTTP_200_OK,
    summary="Get Active Complaint Categories (Employee)",
)
def get_active_categories_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.get_active_categories(db)


@router.post(
    "",
    response_model=ComplaintResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit Daily Complaint (Employee)",
)
async def submit_complaint_endpoint(
    request: Request,
    category_id: int = Form(
        ...,
        description="ID of the selected active complaint category",
    ),
    subject: str = Form(
        ...,
        description="Subject line of the complaint",
    ),
    description: str = Form(
        ...,
        description="Detailed description of the workplace grievance",
    ),
    priority: Optional[ComplaintPriority] = Form(
        ComplaintPriority.MEDIUM,
        description="Initial priority level",
    ),
    attachment: Optional[UploadFile] = File(
        None,
        description="Optional supporting document attachment",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ip_address = request.client.host if request.client else None

    return await service.create_complaint(
        db=db,
        current_user=current_user,
        category_id=category_id,
        subject=subject,
        description=description,
        priority=priority,
        document_file=attachment,
        ip_address=ip_address,
    )


@router.get(
    "/my",
    response_model=PaginatedComplaintResponse,
    status_code=status.HTTP_200_OK,
    summary="Get My Submitted Complaints (Employee)",
)
def get_my_complaints_endpoint(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    complaint_status: Optional[ComplaintStatus] = Query(
        None,
        alias="status",
    ),
    category_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.get_my_complaints(
        db=db,
        user_id=current_user.id,
        page=page,
        limit=limit,
        status=complaint_status,
        category_id=category_id,
    )


@router.get(
    "/my/{complaint_id}",
    response_model=ComplaintResponse,
    status_code=status.HTTP_200_OK,
    summary="Get My Complaint Details (Employee - IDOR Protected)",
)
def get_my_complaint_by_id_endpoint(
    complaint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.get_my_complaint_by_id(
        db=db,
        user_id=current_user.id,
        complaint_id=complaint_id,
    )


# ============================================================
# HR CATEGORY MANAGEMENT ENDPOINTS
# ============================================================

@router.get(
    "/categories",
    response_model=List[ComplaintCategoryResponse],
    status_code=status.HTTP_200_OK,
    summary="Get All Complaint Categories (HR)",
)
def get_all_categories_hr_endpoint(
    db: Session = Depends(get_db),
    current_hr: User = Depends(get_current_hr),
):
    return service.get_all_categories_hr(db)


@router.post(
    "/categories",
    response_model=ComplaintCategoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Complaint Category (HR)",
)
def create_category_endpoint(
    request: Request,
    data: ComplaintCategoryCreate,
    db: Session = Depends(get_db),
    current_hr: User = Depends(get_current_hr),
):
    ip_address = request.client.host if request.client else None

    return service.create_category(
        db=db,
        data=data,
        current_hr_id=current_hr.id,
        ip_address=ip_address,
    )


@router.put(
    "/categories/{category_id}",
    response_model=ComplaintCategoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Complaint Category (HR)",
)
def update_category_endpoint(
    request: Request,
    category_id: int,
    data: ComplaintCategoryUpdate,
    db: Session = Depends(get_db),
    current_hr: User = Depends(get_current_hr),
):
    ip_address = request.client.host if request.client else None

    return service.update_category(
        db=db,
        category_id=category_id,
        data=data,
        current_hr_id=current_hr.id,
        ip_address=ip_address,
    )


@router.patch(
    "/categories/{category_id}/toggle-status",
    response_model=ComplaintCategoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Toggle Complaint Category Active Status (HR)",
)
def toggle_category_status_endpoint(
    request: Request,
    category_id: int,
    db: Session = Depends(get_db),
    current_hr: User = Depends(get_current_hr),
):
    ip_address = request.client.host if request.client else None

    return service.toggle_category_status(
        db=db,
        category_id=category_id,
        current_hr_id=current_hr.id,
        ip_address=ip_address,
    )


# ============================================================
# HR COMPLAINT CASE MANAGEMENT ENDPOINTS
# ============================================================

@router.get(
    "",
    response_model=PaginatedComplaintResponse,
    status_code=status.HTTP_200_OK,
    summary="Get All Complaints (HR)",
)
def get_all_complaints_hr_endpoint(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    complaint_status: Optional[ComplaintStatus] = Query(
        None,
        alias="status",
    ),
    priority: Optional[ComplaintPriority] = Query(None),
    category_id: Optional[int] = Query(None),
    employee_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_hr: User = Depends(get_current_hr),
):
    return service.get_all_complaints_hr(
        db=db,
        page=page,
        limit=limit,
        status=complaint_status,
        priority=priority,
        category_id=category_id,
        employee_id=employee_id,
        search=search,
        from_date=from_date,
        to_date=to_date,
    )


@router.get(
    "/{complaint_id}",
    response_model=ComplaintResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Complaint Details (HR)",
)
def get_complaint_by_id_hr_endpoint(
    complaint_id: int,
    db: Session = Depends(get_db),
    current_hr: User = Depends(get_current_hr),
):
    return service.get_complaint_by_id_hr(
        db=db,
        complaint_id=complaint_id,
    )


@router.patch(
    "/{complaint_id}/status",
    response_model=ComplaintResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Complaint Status (HR)",
)
def update_status_hr_endpoint(
    request: Request,
    complaint_id: int,
    body: ComplaintStatusUpdate,
    db: Session = Depends(get_db),
    current_hr: User = Depends(get_current_hr),
):
    ip_address = request.client.host if request.client else None

    return service.update_status_hr(
        db=db,
        complaint_id=complaint_id,
        new_status=body.status,
        current_hr=current_hr,
        ip_address=ip_address,
    )


@router.patch(
    "/{complaint_id}/priority",
    response_model=ComplaintResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Complaint Priority (HR)",
)
def update_priority_hr_endpoint(
    request: Request,
    complaint_id: int,
    body: ComplaintPriorityUpdate,
    db: Session = Depends(get_db),
    current_hr: User = Depends(get_current_hr),
):
    ip_address = request.client.host if request.client else None

    return service.update_priority_hr(
        db=db,
        complaint_id=complaint_id,
        new_priority=body.priority,
        current_hr=current_hr,
        ip_address=ip_address,
    )


@router.patch(
    "/{complaint_id}/respond",
    response_model=ComplaintResponse,
    status_code=status.HTTP_200_OK,
    summary="Provide HR Response to Complaint (HR)",
)
def respond_complaint_hr_endpoint(
    request: Request,
    complaint_id: int,
    body: ComplaintRespondRequest,
    db: Session = Depends(get_db),
    current_hr: User = Depends(get_current_hr),
):
    ip_address = request.client.host if request.client else None

    return service.respond_complaint_hr(
        db=db,
        complaint_id=complaint_id,
        hr_response=body.hr_response,
        current_hr=current_hr,
        ip_address=ip_address,
    )


@router.patch(
    "/{complaint_id}/resolve",
    response_model=ComplaintResponse,
    status_code=status.HTTP_200_OK,
    summary="Resolve Complaint (HR)",
)
def resolve_complaint_hr_endpoint(
    request: Request,
    complaint_id: int,
    body: ComplaintResolveRequest,
    db: Session = Depends(get_db),
    current_hr: User = Depends(get_current_hr),
):
    ip_address = request.client.host if request.client else None

    return service.resolve_complaint_hr(
        db=db,
        complaint_id=complaint_id,
        resolution=body.resolution,
        current_hr=current_hr,
        ip_address=ip_address,
    )


@router.patch(
    "/{complaint_id}/close",
    response_model=ComplaintResponse,
    status_code=status.HTTP_200_OK,
    summary="Close Complaint (HR)",
)
def close_complaint_hr_endpoint(
    request: Request,
    complaint_id: int,
    db: Session = Depends(get_db),
    current_hr: User = Depends(get_current_hr),
):
    ip_address = request.client.host if request.client else None

    return service.close_complaint_hr(
        db=db,
        complaint_id=complaint_id,
        current_hr=current_hr,
        ip_address=ip_address,
    )