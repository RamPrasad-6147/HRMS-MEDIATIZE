from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.authentication_service.dependencies import get_current_hr, get_current_user
from app.authentication_service.models import User
from app.authentication_service.schemas import (
    HRProfileResponse,
    HRProfileUpdateSchema,
    OTPRequestResponse,
    OTPRequestSchema,
    OTPVerifySchema,
    TokenResponse,
    UserResponse,
)
from app.authentication_service.service import (
    delete_hr_profile_photo,
    get_current_user_profile,
    get_hr_profile,
    request_otp,
    update_hr_profile,
    upload_hr_profile_photo,
    verify_otp,
)
from app.cloudinary_service.service import validate_image_file
from app.core.database import get_db


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)

hr_router = APIRouter(
    prefix="/hr",
    tags=["HR Profile"],
)


# ============================================================
# Request Login OTP
# ============================================================

@router.post(
    "/request-otp",
    response_model=OTPRequestResponse,
)
def handle_request_otp(
    data: OTPRequestSchema,
    request: Request,
    db: Session = Depends(get_db),
) -> OTPRequestResponse:
    """
    Request a 6-digit login OTP.

    The backend identifies the user and their role from
    the database. The frontend never supplies a role.
    """

    ip_address = (
        request.client.host
        if request.client
        else None
    )

    return request_otp(
        db=db,
        email=data.email,
        ip_address=ip_address,
    )


# ============================================================
# Verify Login OTP
# ============================================================

@router.post(
    "/verify-otp",
    response_model=TokenResponse,
)
def handle_verify_otp(
    data: OTPVerifySchema,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """
    Verify the 6-digit login OTP and issue the existing JWT.
    """

    ip_address = (
        request.client.host
        if request.client
        else None
    )

    access_token = verify_otp(
        db=db,
        email=data.email,
        otp=data.otp,
        ip_address=ip_address,
    )

    return TokenResponse(
        access_token=access_token,
    )


# ============================================================
# Current User
# ============================================================

@router.get(
    "/me",
    response_model=UserResponse,
)
def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserResponse:
    """
    Return the currently authenticated user.
    """

    return get_current_user_profile(db=db, user=current_user)


# ============================================================
# HR Profile Endpoints
# ============================================================

@router.get(
    "/hr/profile",
    response_model=HRProfileResponse,
)
@hr_router.get(
    "/profile",
    response_model=HRProfileResponse,
)
def handle_get_hr_profile(
    current_hr: User = Depends(get_current_hr),
    db: Session = Depends(get_db),
) -> HRProfileResponse:
    """
    Get authenticated HR profile details.
    """
    return get_hr_profile(
        db=db,
        hr_user=current_hr,
    )


@router.put(
    "/hr/profile",
    response_model=HRProfileResponse,
)
@router.patch(
    "/hr/profile",
    response_model=HRProfileResponse,
)
@hr_router.put(
    "/profile",
    response_model=HRProfileResponse,
)
@hr_router.patch(
    "/profile",
    response_model=HRProfileResponse,
)
def handle_update_hr_profile(
    data: HRProfileUpdateSchema,
    request: Request,
    current_hr: User = Depends(get_current_hr),
    db: Session = Depends(get_db),
) -> HRProfileResponse:
    """
    Update HR Profile (First Name, Last Name, and Optional Address).
    Whitelisted fields only. Email and Role are read-only and cannot be updated.
    """
    ip_address = request.client.host if request.client else None

    return update_hr_profile(
        db=db,
        hr_user=current_hr,
        data=data,
        ip_address=ip_address,
    )


@router.post(
    "/hr/profile/photo",
    response_model=HRProfileResponse,
)
@router.post(
    "/hr/profile/profile-photo",
    response_model=HRProfileResponse,
)
@hr_router.post(
    "/profile/photo",
    response_model=HRProfileResponse,
)
@hr_router.post(
    "/profile/profile-photo",
    response_model=HRProfileResponse,
)
async def handle_upload_hr_profile_photo(
    request: Request,
    file: UploadFile = File(...),
    current_hr: User = Depends(get_current_hr),
    db: Session = Depends(get_db),
) -> HRProfileResponse:
    """
    Upload/Replace HR profile photo.
    Validates file format/size and stores Cloudinary secure URL in PostgreSQL.
    """
    ip_address = request.client.host if request.client else None

    file_bytes = await file.read()
    validate_image_file(file=file, file_bytes=file_bytes)

    return upload_hr_profile_photo(
        db=db,
        hr_user=current_hr,
        file_bytes=file_bytes,
        ip_address=ip_address,
    )


@router.delete(
    "/hr/profile/photo",
    response_model=HRProfileResponse,
)
@router.delete(
    "/hr/profile/profile-photo",
    response_model=HRProfileResponse,
)
@hr_router.delete(
    "/profile/photo",
    response_model=HRProfileResponse,
)
@hr_router.delete(
    "/profile/profile-photo",
    response_model=HRProfileResponse,
)
def handle_delete_hr_profile_photo(
    request: Request,
    current_hr: User = Depends(get_current_hr),
    db: Session = Depends(get_db),
) -> HRProfileResponse:
    """
    Remove HR profile photo asset from Cloudinary and clear PostgreSQL columns.
    """
    ip_address = request.client.host if request.client else None

    return delete_hr_profile_photo(
        db=db,
        hr_user=current_hr,
        ip_address=ip_address,
    )