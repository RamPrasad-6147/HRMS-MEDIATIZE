from datetime import date
from decimal import Decimal
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
from app.core.database import get_db
from app.leave_service import service
from app.leave_service.enums import LeaveDayType, LeaveStatus
from app.leave_service.schemas import (
    LeaveBalanceResponse,
    LeaveBalanceUpdate,
    LeaveCancelRequest,
    LeaveRequestCreate,
    LeaveRequestResponse,
    LeaveRequestReview,
    LeaveRevokeRequest,
    LeaveTypeCreate,
    LeaveTypeResponse,
    LeaveTypeUpdate,
    PaginatedLeaveResponse,
)

router = APIRouter(tags=["Leave Management"])


# ==========================================
# LEAVE TYPE ENDPOINTS
# ==========================================

@router.get(
    "/leave-types",
    response_model=List[LeaveTypeResponse],
    status_code=status.HTTP_200_OK,
    summary="Get Active Leave Types (Employee & HR)",
)
def get_active_leave_types_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.get_active_leave_types(db)


@router.get(
    "/leave-types/all",
    response_model=List[LeaveTypeResponse],
    status_code=status.HTTP_200_OK,
    summary="Get All Leave Types (HR Only)",
)
def get_all_leave_types_endpoint(
    db: Session = Depends(get_db),
    current_hr: User = Depends(get_current_hr),
):
    return service.get_all_leave_types(db)


@router.post(
    "/leave-types",
    response_model=LeaveTypeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Leave Type (HR Only)",
)
def create_leave_type_endpoint(
    type_in: LeaveTypeCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_hr: User = Depends(get_current_hr),
):
    ip_address = request.client.host if request.client else None

    return service.create_leave_type(
        db=db,
        type_in=type_in,
        current_user=current_hr,
        ip_address=ip_address,
    )


@router.put(
    "/leave-types/{leave_type_id}",
    response_model=LeaveTypeResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Leave Type (HR Only)",
)
def update_leave_type_endpoint(
    leave_type_id: int,
    type_in: LeaveTypeUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_hr: User = Depends(get_current_hr),
):
    ip_address = request.client.host if request.client else None

    return service.update_leave_type(
        db=db,
        leave_type_id=leave_type_id,
        type_in=type_in,
        current_user=current_hr,
        ip_address=ip_address,
    )


@router.patch(
    "/leave-types/{leave_type_id}/activate",
    response_model=LeaveTypeResponse,
    status_code=status.HTTP_200_OK,
    summary="Activate Leave Type (HR Only)",
)
def activate_leave_type_endpoint(
    leave_type_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_hr: User = Depends(get_current_hr),
):
    ip_address = request.client.host if request.client else None

    return service.activate_leave_type(
        db=db,
        leave_type_id=leave_type_id,
        current_user=current_hr,
        ip_address=ip_address,
    )


@router.patch(
    "/leave-types/{leave_type_id}/deactivate",
    response_model=LeaveTypeResponse,
    status_code=status.HTTP_200_OK,
    summary="Deactivate Leave Type (HR Only)",
)
def deactivate_leave_type_endpoint(
    leave_type_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_hr: User = Depends(get_current_hr),
):
    ip_address = request.client.host if request.client else None

    return service.deactivate_leave_type(
        db=db,
        leave_type_id=leave_type_id,
        current_user=current_hr,
        ip_address=ip_address,
    )


# ==========================================
# EMPLOYEE LEAVE ENDPOINTS
# (Declared BEFORE dynamic /{leave_id} routes)
# ==========================================

@router.get(
    "/leaves/me",
    response_model=PaginatedLeaveResponse,
    status_code=status.HTTP_200_OK,
    summary="Get My Leave Requests (Employee Only)",
)
def get_my_leaves_endpoint(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status_param: Optional[LeaveStatus] = Query(None, alias="status"),
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    employee = service.get_employee_record_by_user(db, current_user)

    return service.get_employee_leaves(
        db=db,
        employee_id=employee.id,
        page=page,
        limit=limit,
        status_param=status_param,
        year=year,
    )


@router.get(
    "/leaves/me/balance",
    response_model=List[LeaveBalanceResponse],
    status_code=status.HTTP_200_OK,
    summary="Get My Leave Balances (Employee Only)",
)
def get_my_leave_balance_endpoint(
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    employee = service.get_employee_record_by_user(db, current_user)

    return service.get_employee_balances(
        db=db,
        employee_id=employee.id,
        year=year,
    )


@router.get(
    "/leaves/me/{leave_id}",
    response_model=LeaveRequestResponse,
    status_code=status.HTTP_200_OK,
    summary="Get My Specific Leave Details",
)
def get_my_leave_details_endpoint(
    leave_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.get_leave_details(
        db=db,
        leave_id=leave_id,
        current_user=current_user,
    )


@router.post(
    "/leaves",
    response_model=LeaveRequestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Apply for Leave (Employee Only)",
)
async def apply_leave_endpoint(
    request: Request,
    leave_in: Optional[LeaveRequestCreate] = None,
    leave_type_id: Optional[int] = Form(None),
    start_date: Optional[str] = Form(None),
    end_date: Optional[str] = Form(None),
    start_day_type: Optional[LeaveDayType] = Form(LeaveDayType.FULL_DAY),
    end_day_type: Optional[LeaveDayType] = Form(LeaveDayType.FULL_DAY),
    reason: Optional[str] = Form(None),
    document: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ip_address = request.client.host if request.client else None

    if leave_in is not None:
        req_in = leave_in
        doc = None
    else:
        content_type = request.headers.get("content-type", "")

        if "application/json" in content_type:
            body = await request.json()
            req_in = LeaveRequestCreate(**body)
            doc = None
        else:
            if not leave_type_id or not start_date or not end_date or not reason:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "leave_type_id, start_date, end_date, "
                        "and reason are required."
                    ),
                )

            try:
                parsed_start = date.fromisoformat(start_date)
                parsed_end = date.fromisoformat(end_date)
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid date format. Use YYYY-MM-DD.",
                )

            req_in = LeaveRequestCreate(
                leave_type_id=leave_type_id,
                start_date=parsed_start,
                end_date=parsed_end,
                start_day_type=start_day_type or LeaveDayType.FULL_DAY,
                end_day_type=end_day_type or LeaveDayType.FULL_DAY,
                reason=reason,
            )

            doc = document

    return service.apply_leave(
        db=db,
        req_in=req_in,
        current_user=current_user,
        document=doc,
        ip_address=ip_address,
    )


@router.patch(
    "/leaves/{leave_id}/cancel",
    response_model=LeaveRequestResponse,
    status_code=status.HTTP_200_OK,
    summary="Cancel Pending or Approved Leave Request (Employee Only)",
)
def cancel_leave_endpoint(
    leave_id: int,
    cancel_in: LeaveCancelRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ip_address = request.client.host if request.client else None

    return service.cancel_leave(
        db=db,
        leave_id=leave_id,
        cancel_in=cancel_in,
        current_user=current_user,
        ip_address=ip_address,
    )


# ==========================================
# HR LEAVE MANAGEMENT ENDPOINTS
# ==========================================

@router.get(
    "/leaves",
    response_model=PaginatedLeaveResponse,
    status_code=status.HTTP_200_OK,
    summary="Get All Leave Requests (HR Only)",
)
def get_all_leaves_endpoint(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    employee_id: Optional[int] = Query(None),
    leave_type_id: Optional[int] = Query(None),
    status_param: Optional[LeaveStatus] = Query(None, alias="status"),
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_hr: User = Depends(get_current_hr),
):
    return service.get_all_leaves(
        db=db,
        page=page,
        limit=limit,
        employee_id=employee_id,
        leave_type_id=leave_type_id,
        status_param=status_param,
        year=year,
    )


@router.get(
    "/leaves/{leave_id}",
    response_model=LeaveRequestResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Leave Request Details (HR & Owner Employee)",
)
def get_leave_details_endpoint(
    leave_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.get_leave_details(
        db=db,
        leave_id=leave_id,
        current_user=current_user,
    )


@router.patch(
    "/leaves/{leave_id}/approve",
    response_model=LeaveRequestResponse,
    status_code=status.HTTP_200_OK,
    summary="Approve Leave Request (HR Only)",
)
def approve_leave_endpoint(
    leave_id: int,
    review_in: LeaveRequestReview,
    request: Request,
    db: Session = Depends(get_db),
    current_hr: User = Depends(get_current_hr),
):
    ip_address = request.client.host if request.client else None

    return service.approve_leave(
        db=db,
        leave_id=leave_id,
        review_in=review_in,
        current_user=current_hr,
        ip_address=ip_address,
    )


@router.patch(
    "/leaves/{leave_id}/reject",
    response_model=LeaveRequestResponse,
    status_code=status.HTTP_200_OK,
    summary="Reject Leave Request (HR Only)",
)
def reject_leave_endpoint(
    leave_id: int,
    review_in: LeaveRequestReview,
    request: Request,
    db: Session = Depends(get_db),
    current_hr: User = Depends(get_current_hr),
):
    ip_address = request.client.host if request.client else None

    return service.reject_leave(
        db=db,
        leave_id=leave_id,
        review_in=review_in,
        current_user=current_hr,
        ip_address=ip_address,
    )


@router.patch(
    "/leaves/{leave_id}/revoke",
    response_model=LeaveRequestResponse,
    status_code=status.HTTP_200_OK,
    summary="Revoke Approved or Rejected Leave Decision (HR Only)",
)
def revoke_leave_endpoint(
    leave_id: int,
    revoke_in: LeaveRevokeRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_hr: User = Depends(get_current_hr),
):
    ip_address = request.client.host if request.client else None

    return service.revoke_leave_decision(
        db=db,
        leave_id=leave_id,
        revoke_in=revoke_in,
        current_hr=current_hr,
        ip_address=ip_address,
    )


# ==========================================
# HR LEAVE BALANCE ENDPOINTS
# ==========================================

@router.get(
    "/leave-balances/{employee_id}",
    response_model=List[LeaveBalanceResponse],
    status_code=status.HTTP_200_OK,
    summary="Get Employee Leave Balances (HR Only)",
)
def get_employee_balances_endpoint(
    employee_id: int,
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_hr: User = Depends(get_current_hr),
):
    return service.get_employee_balances(
        db=db,
        employee_id=employee_id,
        year=year,
    )


@router.put(
    "/leave-balances/{employee_id}/{leave_type_id}",
    response_model=LeaveBalanceResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Employee Leave Balance (HR Only)",
)
def update_employee_balance_endpoint(
    employee_id: int,
    leave_type_id: int,
    balance_in: LeaveBalanceUpdate,
    year: Optional[int] = Query(None),
    request: Request = None,
    db: Session = Depends(get_db),
    current_hr: User = Depends(get_current_hr),
):
    if year is None:
        year = date.today().year

    ip_address = request.client.host if request and request.client else None

    return service.update_employee_balance(
        db=db,
        employee_id=employee_id,
        leave_type_id=leave_type_id,
        balance_in=balance_in,
        year=year,
        current_user=current_hr,
        ip_address=ip_address,
    )