from datetime import date
from typing import List, Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
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
from app.core.database import get_db
from app.work_report_service import service
from app.work_report_service.schemas import (
    AssignedProjectResponse,
    PaginatedWorkReportResponse,
    WorkReportResponse,
)

router = APIRouter(
    prefix="/work-reports",
    tags=["Employee Work Reports"],
)


# ============================================================
# EMPLOYEE ENDPOINTS
# ============================================================

@router.get(
    "/my/projects",
    response_model=List[AssignedProjectResponse],
    status_code=status.HTTP_200_OK,
    summary="Get Active Assigned Projects (Employee)",
)
def get_my_assigned_projects_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.get_assigned_projects_for_employee(
        db,
        current_user.id,
    )


@router.post(
    "",
    response_model=WorkReportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit Daily Work Report (Employee)",
)
async def submit_work_report_endpoint(
    request: Request,
    project_id: int = Form(
        ...,
        description="ID of the assigned project",
    ),
    work_description: str = Form(
        ...,
        description="Description of work done",
    ),
    problems_faced: Optional[str] = Form(
        None,
        description="Issues or challenges encountered",
    ),
    document: Optional[UploadFile] = File(
        None,
        description="Optional supporting document attachment",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ip_address = (
        request.client.host
        if request.client
        else None
    )

    return await service.create_work_report(
        db=db,
        current_user=current_user,
        project_id=project_id,
        work_description=work_description,
        problems_faced=problems_faced,
        document_file=document,
        ip_address=ip_address,
    )


@router.get(
    "/my",
    response_model=PaginatedWorkReportResponse,
    status_code=status.HTTP_200_OK,
    summary="Get My Work Reports (Employee)",
)
def get_my_work_reports_endpoint(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    project_id: Optional[int] = Query(None),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.get_my_work_reports(
        db=db,
        user_id=current_user.id,
        page=page,
        limit=limit,
        project_id=project_id,
        from_date=from_date,
        to_date=to_date,
    )


@router.get(
    "/my/{report_id}",
    response_model=WorkReportResponse,
    status_code=status.HTTP_200_OK,
    summary="Get My Work Report Details (Employee - IDOR Protected)",
)
def get_my_work_report_by_id_endpoint(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.get_my_work_report_by_id(
        db=db,
        user_id=current_user.id,
        report_id=report_id,
    )


# ============================================================
# HR ENDPOINTS
# ============================================================

@router.get(
    "/today",
    status_code=status.HTTP_200_OK,
    summary="Get Today's Work Report Summary (HR)",
)
def get_todays_work_reports_endpoint(
    db: Session = Depends(get_db),
    current_hr: User = Depends(get_current_hr),
):
    return service.get_todays_work_reports_hr(db)


@router.get(
    "",
    response_model=PaginatedWorkReportResponse,
    status_code=status.HTTP_200_OK,
    summary="Get All Work Reports (HR)",
)
def get_all_work_reports_hr_endpoint(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    employee_id: Optional[int] = Query(None),
    project_id: Optional[int] = Query(None),
    report_date: Optional[date] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_hr: User = Depends(get_current_hr),
):
    return service.get_all_work_reports_hr(
        db=db,
        page=page,
        limit=limit,
        employee_id=employee_id,
        project_id=project_id,
        report_date=report_date,
        search=search,
    )


@router.get(
    "/{report_id}",
    response_model=WorkReportResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Work Report Details (HR)",
)
def get_work_report_by_id_hr_endpoint(
    report_id: int,
    db: Session = Depends(get_db),
    current_hr: User = Depends(get_current_hr),
):
    return service.get_work_report_by_id_hr(
        db=db,
        report_id=report_id,
    )