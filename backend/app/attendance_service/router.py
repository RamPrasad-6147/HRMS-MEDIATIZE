from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.attendance_service import service
from app.attendance_service.models import AttendanceStatus
from app.attendance_service.schemas import (
    AttendancePaginatedResponse,
    AttendanceResponse,
    AttendanceTodayResponse,
)
from app.authentication_service.dependencies import (
    get_current_hr,
    get_current_user,
)
from app.authentication_service.models import User
from app.core.database import get_db


router = APIRouter(
    prefix="/attendance",
    tags=["Attendance Management"],
)


@router.post(
    "/check-in",
    response_model=AttendanceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Employee Check-In (Employee Only)",
)
def check_in_endpoint(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ip_address = request.client.host if request.client else None

    return service.check_in_employee(
        db=db,
        current_user=current_user,
        ip_address=ip_address,
    )


@router.post(
    "/check-out",
    response_model=AttendanceResponse,
    status_code=status.HTTP_200_OK,
    summary="Employee Check-Out (Employee Only)",
)
def check_out_endpoint(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ip_address = request.client.host if request.client else None

    return service.check_out_employee(
        db=db,
        current_user=current_user,
        ip_address=ip_address,
    )


@router.get(
    "/me/today",
    response_model=AttendanceTodayResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Today's Attendance Status (Employee Only)",
)
def get_today_attendance_endpoint(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.get_today_attendance(
        db=db,
        current_user=current_user,
    )


@router.get(
    "/me",
    response_model=AttendancePaginatedResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Own Attendance History (Employee Only)",
)
def get_my_attendance_history_endpoint(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    from_date: Optional[date] = Query(
        None,
        description="Filter from date",
    ),
    to_date: Optional[date] = Query(
        None,
        description="Filter to date",
    ),
    status: Optional[AttendanceStatus] = Query(
        None,
        description="Filter by status",
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.get_employee_attendance_history(
        db=db,
        current_user=current_user,
        page=page,
        limit=limit,
        from_date=from_date,
        to_date=to_date,
        status_filter=status,
    )


@router.get(
    "",
    response_model=AttendancePaginatedResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Attendance List (HR Only)",
)
def get_hr_attendance_list_endpoint(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(
        None,
        description="Search employee code/name/email",
    ),
    employee_id: Optional[int] = Query(
        None,
        description="Filter by employee ID",
    ),
    status: Optional[AttendanceStatus] = Query(
        None,
        description="Filter by status",
    ),
    from_date: Optional[date] = Query(
        None,
        description="Filter from date",
    ),
    to_date: Optional[date] = Query(
        None,
        description="Filter to date",
    ),
    current_hr: User = Depends(get_current_hr),
    db: Session = Depends(get_db),
):
    return service.get_hr_attendance_list(
        db=db,
        page=page,
        limit=limit,
        search=search,
        employee_id=employee_id,
        status_filter=status,
        from_date=from_date,
        to_date=to_date,
    )


@router.get(
    "/{attendance_id}",
    response_model=AttendanceResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Attendance Details by ID",
)
def get_attendance_details_endpoint(
    attendance_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.get_attendance_by_id(
        db=db,
        attendance_id=attendance_id,
        current_user=current_user,
    )