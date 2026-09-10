import hashlib
import hmac
import secrets
import string
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.authentication_service.models import (
    EmailOTP,
    EmailOTPPurpose,
    User,
    UserRole,
)
from app.authentication_service.schemas import (
    HRProfileResponse,
    HRProfileUpdateSchema,
    OTPRequestResponse,
    UserResponse,
)
from app.audit_service.models import AuditAction
from app.audit_service.service import create_audit_log
from app.cloudinary_service.service import (
    delete_image,
    replace_image,
    validate_image_file,
)
from app.core.config import settings
from app.core.security import create_access_token
from app.email_service.service import send_otp_email
from app.employee_service.models import Employee, EmploymentStatus


# ============================================================
# Helpers
# ============================================================

def make_aware(
    dt: datetime | None,
) -> datetime | None:
    """
    Ensure a datetime is timezone-aware in UTC.
    """

    if dt is None:
        return None

    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)

    return dt


def hash_otp(otp: str) -> str:
    """
    Hash an OTP using HMAC-SHA256.

    A plain SHA-256 hash is intentionally not used because
    the OTP has only a 1,000,000-value search space.

    OTP_HASH_SECRET must be a strong server-side secret and
    must never be logged or committed to source control.
    """

    secret = settings.OTP_HASH_SECRET.encode("utf-8")
    otp_bytes = otp.strip().encode("utf-8")

    return hmac.new(
        secret,
        otp_bytes,
        hashlib.sha256,
    ).hexdigest()


def generate_otp() -> str:
    """
    Generate a cryptographically secure 6-digit OTP.

    The return value is a string so leading zeros are preserved.
    """

    return "".join(
        secrets.choice(string.digits)
        for _ in range(6)
    )


def check_user_eligibility(
    db: Session,
    user: User | None,
) -> bool:
    """
    Determine whether a user is eligible for passwordless
    authentication.

    HR:
        User must be active.

    Employee:
        User must be active.
        Employee record must exist.
        Employee must not be soft-deleted.
        Employment status cannot be INACTIVE or TERMINATED.
    """

    if user is None:
        return False

    if not user.is_active:
        return False

    if user.role == UserRole.EMPLOYEE:
        employee = db.scalar(
            select(Employee).where(
                Employee.user_id == user.id,
            )
        )

        if employee is None:
            return False

        if employee.deleted_at is not None:
            return False

        if employee.employment_status in (
            EmploymentStatus.INACTIVE,
            EmploymentStatus.TERMINATED,
        ):
            return False

    return True


def get_employee_name(
    db: Session,
    user: User,
) -> str:
    """
    Get a friendly employee name for the OTP email.
    """

    employee = db.scalar(
        select(Employee).where(
            Employee.user_id == user.id,
        )
    )

    if employee is not None:
        full_name = (
            f"{employee.first_name or ''} "
            f"{employee.last_name or ''}"
        ).strip()

        if full_name:
            return full_name

    return user.email


# ============================================================
# Request OTP
# ============================================================

def request_otp(
    db: Session,
    email: str,
    ip_address: str | None = None,
) -> OTPRequestResponse:
    """
    Request a 6-digit LOGIN OTP.

    Security requirements:
    - Generic response for unknown/ineligible accounts.
    - 60-second cooldown.
    - Maximum OTP requests per configured time window.
    - Previous active LOGIN OTPs are invalidated.
    - OTP is cryptographically generated.
    - OTP is HMAC-SHA256 hashed before storage.
    - OTP is never returned or logged.
    - Email failure leaves no usable newly-created OTP.
    """

    clean_email = email.strip().lower()

    user = db.scalar(
        select(User).where(
            User.email == clean_email,
        )
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email does not exist",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is deactivated",
        )

    if user.role == UserRole.EMPLOYEE:
        employee = db.scalar(
            select(Employee).where(
                Employee.user_id == user.id,
            )
        )

        if (
            employee is None
            or employee.deleted_at is not None
            or employee.employment_status in (
                EmploymentStatus.INACTIVE,
                EmploymentStatus.TERMINATED,
            )
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is deactivated",
            )

    # --------------------------------------------------------
    # Lock the user row to serialize OTP requests.
    # PostgreSQL is the project's target database.
    # --------------------------------------------------------

    user = db.scalar(
        select(User)
        .where(User.id == user.id)
        .with_for_update()
    )

    now = datetime.now(timezone.utc)

    # --------------------------------------------------------
    # Only LOGIN OTPs participate in login rate limiting.
    # --------------------------------------------------------

    last_otp = db.scalar(
        select(EmailOTP)
        .where(
            EmailOTP.user_id == user.id,
            EmailOTP.purpose == EmailOTPPurpose.LOGIN,
        )
        .order_by(
            EmailOTP.created_at.desc()
        )
        .limit(1)
    )

    if last_otp is not None:
        last_created = make_aware(
            last_otp.created_at
        )

        if last_created is not None:
            seconds_since_last = (
                now - last_created
            ).total_seconds()

            if (
                seconds_since_last
                < settings.OTP_REQUEST_COOLDOWN_SECONDS
            ):
                remaining = max(
                    1,
                    int(
                        settings.OTP_REQUEST_COOLDOWN_SECONDS
                        - seconds_since_last
                    ),
                )

                raise HTTPException(
                    status_code=(
                        status.HTTP_429_TOO_MANY_REQUESTS
                    ),
                    detail=(
                        f"Please wait {remaining} "
                        "seconds before requesting "
                        "another code."
                    ),
                )

    # --------------------------------------------------------
    # Request-window rate limiting.
    # --------------------------------------------------------

    window_start = (
        now - timedelta(minutes=15)
    )

    request_count = db.scalar(
        select(func.count(EmailOTP.id))
        .where(
            EmailOTP.user_id == user.id,
            EmailOTP.purpose == EmailOTPPurpose.LOGIN,
            EmailOTP.created_at >= window_start,
        )
    ) or 0

    if (
        request_count
        >= settings.OTP_MAX_REQUESTS_PER_WINDOW
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_429_TOO_MANY_REQUESTS
            ),
            detail=(
                "Too many verification code "
                "requests. Please try again later."
            ),
        )

    # --------------------------------------------------------
    # Invalidate previous unused LOGIN OTPs.
    # --------------------------------------------------------

    db.execute(
        update(EmailOTP)
        .where(
            EmailOTP.user_id == user.id,
            EmailOTP.purpose == EmailOTPPurpose.LOGIN,
            EmailOTP.used_at.is_(None),
        )
        .values(
            expires_at=now,
        )
    )

    # --------------------------------------------------------
    # Generate OTP.
    # --------------------------------------------------------

    otp_code = generate_otp()

    otp_hash = hash_otp(
        otp_code
    )

    expires_at = (
        now
        + timedelta(
            minutes=settings.OTP_EXPIRE_MINUTES
        )
    )

    new_otp = EmailOTP(
        user_id=user.id,
        purpose=EmailOTPPurpose.LOGIN,
        otp_hash=otp_hash,
        expires_at=expires_at,
        attempt_count=0,
        requested_ip=ip_address,
    )

    db.add(new_otp)
    db.flush()

    # --------------------------------------------------------
    # Send email.
    #
    # The database transaction has not been committed yet.
    # If sending fails, the newly-created OTP must not remain
    # usable.
    # --------------------------------------------------------

    employee_name = get_employee_name(
        db,
        user,
    )

    try:
        send_otp_email(
            recipient_email=user.email,
            otp_code=otp_code,
            employee_name=employee_name,
            expire_minutes=settings.OTP_EXPIRE_MINUTES,
        )

    except Exception:
        db.rollback()

        # A rollback restores the previous transaction state,
        # so explicitly invalidate any currently active LOGIN
        # OTPs in a fresh transaction.
        try:
            cleanup_now = datetime.now(
                timezone.utc
            )

            db.execute(
                update(EmailOTP)
                .where(
                    EmailOTP.user_id == user.id,
                    EmailOTP.purpose
                    == EmailOTPPurpose.LOGIN,
                    EmailOTP.used_at.is_(None),
                )
                .values(
                    expires_at=cleanup_now,
                )
            )

            db.commit()

        except Exception:
            db.rollback()

        raise HTTPException(
            status_code=(
                status.HTTP_503_SERVICE_UNAVAILABLE
            ),
            detail=(
                "Unable to send verification code "
                "email. Please try again later."
            ),
        )

    # --------------------------------------------------------
    # Audit only after successful email delivery.
    # Never include the raw OTP in audit data.
    # --------------------------------------------------------

    try:
        create_audit_log(
            db=db,
            action=AuditAction.OTP_REQUESTED,
            user_id=user.id,
            ip_address=ip_address,
        )

        db.commit()

    except Exception:
        db.rollback()

        # The email was already sent. We must not leave the
        # OTP usable if its database/audit transaction failed.
        try:
            cleanup_now = datetime.now(
                timezone.utc
            )

            db.execute(
                update(EmailOTP)
                .where(
                    EmailOTP.user_id == user.id,
                    EmailOTP.purpose
                    == EmailOTPPurpose.LOGIN,
                    EmailOTP.used_at.is_(None),
                )
                .values(
                    expires_at=cleanup_now,
                )
            )

            db.commit()

        except Exception:
            db.rollback()

        raise HTTPException(
            status_code=(
                status.HTTP_503_SERVICE_UNAVAILABLE
            ),
            detail=(
                "Unable to process verification "
                "code request. Please try again later."
            ),
        )

    return OTPRequestResponse(
        message="OTP sent successfully",
        expires_in_seconds=settings.OTP_EXPIRE_MINUTES * 60,
    )


# ============================================================
# Verify OTP
# ============================================================

def verify_otp(
    db: Session,
    email: str,
    otp: str,
    ip_address: str | None = None,
) -> str:
    """
    Verify a LOGIN OTP and return the existing JWT.

    Security requirements:
    - Only LOGIN OTPs are considered.
    - OTP expires after configured lifetime.
    - Maximum 5 incorrect attempts.
    - OTP becomes invalid after max attempts.
    - OTP can only be used once.
    - Constant-time hash comparison.
    - Role is read from the database.
    - must_change_password is not involved because it no longer exists.
    """

    clean_email = email.strip().lower()
    clean_otp = otp.strip()

    user = db.scalar(
        select(User).where(
            User.email == clean_email,
        )
    )

    if not check_user_eligibility(db, user):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid verification code or email",
        )

    # --------------------------------------------------------
    # Lock user row to serialize concurrent verification
    # attempts.
    # --------------------------------------------------------

    user = db.scalar(
        select(User)
        .where(User.id == user.id)
        .with_for_update()
    )

    if not check_user_eligibility(db, user):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid verification code or email",
        )

    # --------------------------------------------------------
    # Lock the latest LOGIN OTP.
    # --------------------------------------------------------

    otp_record = db.scalar(
        select(EmailOTP)
        .where(
            EmailOTP.user_id == user.id,
            EmailOTP.purpose == EmailOTPPurpose.LOGIN,
        )
        .order_by(
            EmailOTP.created_at.desc()
        )
        .limit(1)
        .with_for_update()
    )

    if otp_record is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "No verification code found. "
                "Please request a new code."
            ),
        )

    now = datetime.now(timezone.utc)

    # --------------------------------------------------------
    # Already used
    # --------------------------------------------------------

    if otp_record.used_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Verification code has already been "
                "used. Please request a new code."
            ),
        )

    # --------------------------------------------------------
    # Maximum attempts reached
    # --------------------------------------------------------

    if (
        otp_record.attempt_count
        >= settings.OTP_MAX_ATTEMPTS
    ):
        otp_record.expires_at = now

        create_audit_log(
            db=db,
            action=AuditAction.OTP_ATTEMPT_LIMIT_REACHED,
            user_id=user.id,
            ip_address=ip_address,
        )

        db.commit()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Maximum verification attempts "
                "exceeded. Please request a new code."
            ),
        )

    # --------------------------------------------------------
    # Expiration
    # --------------------------------------------------------

    expires_at = make_aware(
        otp_record.expires_at
    )

    if expires_at is None or now >= expires_at:
        otp_record.expires_at = now

        create_audit_log(
            db=db,
            action=AuditAction.OTP_EXPIRED,
            user_id=user.id,
            ip_address=ip_address,
        )

        db.commit()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Verification code has expired. "
                "Please request a new code."
            ),
        )

    # --------------------------------------------------------
    # Validate OTP format defensively.
    # The Pydantic schema normally handles this first.
    # --------------------------------------------------------

    if (
        len(clean_otp) != 6
        or not clean_otp.isdigit()
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code",
        )

    # --------------------------------------------------------
    # Constant-time verification.
    # --------------------------------------------------------

    submitted_hash = hash_otp(
        clean_otp
    )

    if not secrets.compare_digest(
        submitted_hash,
        otp_record.otp_hash,
    ):
        otp_record.attempt_count += 1

        if (
            otp_record.attempt_count
            >= settings.OTP_MAX_ATTEMPTS
        ):
            otp_record.expires_at = now

            create_audit_log(
                db=db,
                action=(
                    AuditAction
                    .OTP_ATTEMPT_LIMIT_REACHED
                ),
                user_id=user.id,
                ip_address=ip_address,
            )

        else:
            create_audit_log(
                db=db,
                action=(
                    AuditAction
                    .OTP_VERIFY_FAILURE
                ),
                user_id=user.id,
                ip_address=ip_address,
            )

        db.commit()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code",
        )

    # --------------------------------------------------------
    # Successful verification.
    # --------------------------------------------------------

    otp_record.used_at = now
    user.last_login_at = now

    create_audit_log(
        db=db,
        action=AuditAction.OTP_VERIFY_SUCCESS,
        user_id=user.id,
        ip_address=ip_address,
    )

    db.commit()

    # --------------------------------------------------------
    # Existing JWT infrastructure.
    # Role comes from the database.
    # --------------------------------------------------------

    return create_access_token(
        user_id=user.id,
        role=user.role.value,
    )


# ============================================================
# HR Profile Services (Name, Optional Address, Photo)
# ============================================================

def ensure_hr_employee(
    db: Session,
    hr_user: User,
) -> Employee:
    """
    Get or create an Employee record for the HR User.
    This links HR's first_name, last_name, address, and profile_photo_url
    to the PostgreSQL employees table.
    """
    employee = db.scalar(
        select(Employee).where(
            Employee.user_id == hr_user.id,
        )
    )

    if employee is None:
        employee_code = f"HR{hr_user.id:03d}"
        employee = Employee(
            user_id=hr_user.id,
            employee_code=employee_code,
            first_name="Mohan",
            last_name="Medisetti",
            address=None,
            employment_status=EmploymentStatus.ACTIVE,
        )
        db.add(employee)
        db.commit()
        db.refresh(employee)

        if not hr_user.employee_id:
            hr_user.employee_id = employee.id
            db.commit()
            db.refresh(hr_user)

    return employee


def get_current_user_profile(
    db: Session,
    user: User,
) -> UserResponse:
    """
    Fetch public profile information for the currently authenticated user (GET /auth/me).
    Populates first_name, last_name, and profile_photo_url from the linked Employee record.
    """
    employee = db.scalar(
        select(Employee).where(
            Employee.user_id == user.id,
        )
    )

    if user.role == UserRole.HR and employee is None:
        employee = ensure_hr_employee(db, user)

    first_name = employee.first_name if employee else None
    last_name = employee.last_name if employee else None
    profile_photo_url = employee.profile_photo_url if employee else None

    return UserResponse(
        id=user.id,
        email=user.email,
        employee_id=user.employee_id or (str(employee.id) if employee else None),
        role=user.role.value,
        is_active=user.is_active,
        first_name=first_name,
        last_name=last_name,
        profile_photo_url=profile_photo_url,
    )


def get_hr_profile(
    db: Session,
    hr_user: User,
) -> HRProfileResponse:
    """
    Return authenticated HR user profile information.
    Email and Role are read-only.
    """
    if not hr_user.is_active or hr_user.role != UserRole.HR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="HR access required",
        )

    employee = ensure_hr_employee(db, hr_user)

    return HRProfileResponse(
        id=hr_user.id,
        email=hr_user.email,
        role=hr_user.role.value,
        is_active=hr_user.is_active,
        first_name=employee.first_name,
        last_name=employee.last_name,
        address=employee.address,
        profile_photo_url=employee.profile_photo_url,
        employee_id=hr_user.employee_id or employee.id,
        last_login_at=hr_user.last_login_at,
        created_at=hr_user.created_at,
    )


def update_hr_profile(
    db: Session,
    hr_user: User,
    data: HRProfileUpdateSchema,
    ip_address: str | None = None,
) -> HRProfileResponse:
    """
    Update allowed HR Profile fields (Name & Optional Address).
    Backend Whitelist:
    - Allowed: first_name, last_name, address
    - NOT Allowed: email, role, is_active, employee_id, employee_code

    Email is company-controlled and read-only.
    """
    if not hr_user.is_active or hr_user.role != UserRole.HR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="HR access required",
        )

    employee = ensure_hr_employee(db, hr_user)

    fields_set = data.model_dump(exclude_unset=True)

    if "first_name" in fields_set and data.first_name is not None:
        employee.first_name = data.first_name.strip()

    if "last_name" in fields_set and data.last_name is not None:
        employee.last_name = data.last_name.strip()

    if "address" in fields_set:
        if data.address is not None:
            cleaned_address = data.address.strip()
            employee.address = cleaned_address if cleaned_address else None
        else:
            employee.address = None

    employee.updated_at = datetime.now(timezone.utc)

    create_audit_log(
        db=db,
        action=AuditAction.HR_PROFILE_UPDATED,
        user_id=hr_user.id,
        ip_address=ip_address,
    )

    db.commit()
    db.refresh(employee)

    return get_hr_profile(db, hr_user)


def upload_hr_profile_photo(
    db: Session,
    hr_user: User,
    file_bytes: bytes,
    ip_address: str | None = None,
) -> HRProfileResponse:
    """
    Upload/Replace HR profile photo using Cloudinary service.
    Store only the Cloudinary secure URL in PostgreSQL.
    """
    if not hr_user.is_active or hr_user.role != UserRole.HR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="HR access required",
        )

    employee = ensure_hr_employee(db, hr_user)

    upload_result = replace_image(
        old_public_id=employee.profile_photo_public_id,
        new_file_bytes=file_bytes,
    )

    employee.profile_photo_url = upload_result["url"]
    employee.profile_photo_public_id = upload_result["public_id"]
    employee.updated_at = datetime.now(timezone.utc)

    create_audit_log(
        db=db,
        action=AuditAction.HR_PROFILE_PHOTO_UPDATED,
        user_id=hr_user.id,
        ip_address=ip_address,
    )

    db.commit()
    db.refresh(employee)

    return get_hr_profile(db, hr_user)


def delete_hr_profile_photo(
    db: Session,
    hr_user: User,
    ip_address: str | None = None,
) -> HRProfileResponse:
    """
    Remove HR profile photo from Cloudinary and clear PostgreSQL fields.
    """
    if not hr_user.is_active or hr_user.role != UserRole.HR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="HR access required",
        )

    employee = ensure_hr_employee(db, hr_user)

    if employee.profile_photo_public_id:
        delete_image(employee.profile_photo_public_id)

    employee.profile_photo_url = None
    employee.profile_photo_public_id = None
    employee.updated_at = datetime.now(timezone.utc)

    create_audit_log(
        db=db,
        action=AuditAction.HR_PROFILE_PHOTO_UPDATED,
        user_id=hr_user.id,
        ip_address=ip_address,
    )

    db.commit()
    db.refresh(employee)

    return get_hr_profile(db, hr_user)