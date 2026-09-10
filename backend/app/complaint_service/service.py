import math
from datetime import date, datetime, timezone
from typing import List, Optional

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.audit_service.models import AuditAction
from app.audit_service.service import create_audit_log
from app.authentication_service.models import User, UserRole
from app.cloudinary_service.service import upload_document
from app.complaint_service.models import Complaint, ComplaintCategory, ComplaintPriority, ComplaintStatus
from app.complaint_service.schemas import (
    ComplaintCategoryCreate,
    ComplaintCategoryResponse,
    ComplaintCategoryUpdate,
    ComplaintResponse,
    PaginatedComplaintResponse,
)
from app.employee_service.models import Employee
from app.notification_service.enums import NotificationType
from app.notification_service.service import create_notification


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def generate_complaint_code(db: Session) -> str:
    """Generate a safe, unique complaint code like CMP001, CMP002."""
    max_id = db.scalar(select(func.max(Complaint.id))) or 0
    next_id = max_id + 1
    code = f"CMP{next_id:03d}"
    
    # Ensure uniqueness in case of race condition or gaps
    while db.scalar(select(Complaint.id).where(Complaint.complaint_code == code)) is not None:
        next_id += 1
        code = f"CMP{next_id:03d}"
        
    return code


def build_complaint_response(complaint: Complaint) -> ComplaintResponse:
    """Helper to convert Complaint ORM to ComplaintResponse with joined names."""
    emp_name = None
    emp_code = None
    if complaint.employee:
        emp_name = f"{complaint.employee.first_name} {complaint.employee.last_name}".strip()
        emp_code = complaint.employee.employee_code

    cat_name = complaint.category.name if complaint.category else None

    return ComplaintResponse(
        id=complaint.id,
        complaint_code=complaint.complaint_code,
        employee_id=complaint.employee_id,
        employee_name=emp_name,
        employee_code=emp_code,
        category_id=complaint.category_id,
        category_name=cat_name,
        subject=complaint.subject,
        description=complaint.description,
        priority=complaint.priority,
        status=complaint.status,
        hr_response=complaint.hr_response,
        resolution=complaint.resolution,
        attachment_url=complaint.attachment_url,
        attachment_name=complaint.attachment_name,
        created_at=complaint.created_at,
        updated_at=complaint.updated_at,
        resolved_at=complaint.resolved_at,
        closed_at=complaint.closed_at,
    )


# ============================================================
# CATEGORY MANAGEMENT
# ============================================================

def get_active_categories(db: Session) -> List[ComplaintCategoryResponse]:
    """Get active categories for employee submission dropdown."""
    categories = db.scalars(
        select(ComplaintCategory)
        .where(ComplaintCategory.is_active == True)
        .order_by(ComplaintCategory.name)
    ).all()
    return [ComplaintCategoryResponse.model_validate(c) for c in categories]


def get_all_categories_hr(db: Session) -> List[ComplaintCategoryResponse]:
    """Get all categories for HR management."""
    categories = db.scalars(
        select(ComplaintCategory).order_by(ComplaintCategory.name)
    ).all()
    return [ComplaintCategoryResponse.model_validate(c) for c in categories]


def create_category(
    db: Session,
    data: ComplaintCategoryCreate,
    current_hr_id: int,
    ip_address: Optional[str] = None,
) -> ComplaintCategoryResponse:
    """Create a new complaint category (HR)."""
    clean_name = data.name.strip().upper()
    existing = db.scalar(
        select(ComplaintCategory).where(func.upper(ComplaintCategory.name) == clean_name)
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Category with name '{clean_name}' already exists.",
        )

    category = ComplaintCategory(
        name=clean_name,
        description=data.description.strip() if data.description else None,
        is_active=True,
    )
    db.add(category)
    db.commit()
    db.refresh(category)

    create_audit_log(
        db=db,
        action=AuditAction.COMPLAINT_CATEGORY_CREATED,
        user_id=current_hr_id,
        ip_address=ip_address,
    )

    return ComplaintCategoryResponse.model_validate(category)


def update_category(
    db: Session,
    category_id: int,
    data: ComplaintCategoryUpdate,
    current_hr_id: int,
    ip_address: Optional[str] = None,
) -> ComplaintCategoryResponse:
    """Update a complaint category (HR)."""
    category = db.get(ComplaintCategory, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint category not found.",
        )

    if data.name:
        clean_name = data.name.strip().upper()
        existing = db.scalar(
            select(ComplaintCategory).where(
                func.upper(ComplaintCategory.name) == clean_name,
                ComplaintCategory.id != category_id,
            )
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category with name '{clean_name}' already exists.",
            )
        category.name = clean_name

    if data.description is not None:
        category.description = data.description.strip() if data.description else None

    if data.is_active is not None:
        category.is_active = data.is_active

    category.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(category)

    create_audit_log(
        db=db,
        action=AuditAction.COMPLAINT_CATEGORY_UPDATED,
        user_id=current_hr_id,
        ip_address=ip_address,
    )

    return ComplaintCategoryResponse.model_validate(category)


def toggle_category_status(
    db: Session,
    category_id: int,
    current_hr_id: int,
    ip_address: Optional[str] = None,
) -> ComplaintCategoryResponse:
    """Toggle active/inactive status of a category (HR)."""
    category = db.get(ComplaintCategory, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint category not found.",
        )

    category.is_active = not category.is_active
    category.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(category)

    create_audit_log(
        db=db,
        action=AuditAction.COMPLAINT_CATEGORY_UPDATED,
        user_id=current_hr_id,
        ip_address=ip_address,
    )

    return ComplaintCategoryResponse.model_validate(category)


# ============================================================
# EMPLOYEE COMPLAINT OPERATIONS
# ============================================================

async def create_complaint(
    db: Session,
    current_user: User,
    category_id: int,
    subject: str,
    description: str,
    priority: Optional[ComplaintPriority] = ComplaintPriority.MEDIUM,
    document_file: Optional[UploadFile] = None,
    ip_address: Optional[str] = None,
) -> ComplaintResponse:
    """Submit a workplace complaint (Employee)."""
    # 1. Fetch employee profile
    employee = db.scalar(select(Employee).where(Employee.user_id == current_user.id))
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current authenticated user has no linked employee profile.",
        )

    # 2. Validate category
    category = db.get(ComplaintCategory, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selected complaint category does not exist.",
        )
    if not category.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selected complaint category is inactive and cannot be chosen.",
        )

    # 3. Validate Subject & Description
    clean_subject = subject.strip()
    if len(clean_subject) < 3 or len(clean_subject) > 255:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subject must be between 3 and 255 characters.",
        )

    clean_desc = description.strip()
    if len(clean_desc) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Description must be at least 10 characters long.",
        )

    # 4. Handle attachment upload if present
    attachment_url = None
    attachment_public_id = None
    attachment_name = None

    if document_file and document_file.filename:
        # Check size (5MB max)
        file_bytes = await document_file.read()
        if len(file_bytes) > 5 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Attachment file size exceeds 5 MB limit.",
            )

        # Check extension
        ext = document_file.filename.split(".")[-1].lower()
        allowed_extensions = {"pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "png", "jpg", "jpeg"}
        if ext not in allowed_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File format '.{ext}' is not supported. Allowed formats: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, PNG, JPG, JPEG.",
            )

        # Upload file using Cloudinary service
        document_file.file.seek(0)
        upload_result = upload_document(document_file, folder="complaints")
        attachment_url = upload_result.get("secure_url")
        attachment_public_id = upload_result.get("public_id")
        attachment_name = document_file.filename

    # 5. Generate Code and save Complaint
    complaint_code = generate_complaint_code(db)

    complaint = Complaint(
        complaint_code=complaint_code,
        employee_id=employee.id,
        category_id=category_id,
        subject=clean_subject,
        description=clean_desc,
        priority=priority or ComplaintPriority.MEDIUM,
        status=ComplaintStatus.OPEN,
        attachment_url=attachment_url,
        attachment_public_id=attachment_public_id,
        attachment_name=attachment_name,
    )

    db.add(complaint)
    db.commit()
    db.refresh(complaint)

    # 6. Audit & Notification
    create_audit_log(
        db=db,
        action=AuditAction.COMPLAINT_CREATED,
        user_id=current_user.id,
        ip_address=ip_address,
    )

    # Notify HR Users of new complaint
    hr_users = db.scalars(select(User).where(User.role == UserRole.HR, User.is_active == True)).all()
    for hr_user in hr_users:
        create_notification(
            db=db,
            user_id=hr_user.id,
            title="New Workplace Complaint Submitted",
            message=f"Employee {employee.first_name} {employee.last_name} ({employee.employee_code}) submitted a new complaint [{complaint_code}]: '{clean_subject}'.",
            notification_type=NotificationType.COMPLAINT_SUBMITTED,
            reference_id=str(complaint.id),
            reference_type="complaint",
        )

    return build_complaint_response(complaint)


def get_my_complaints(
    db: Session,
    user_id: int,
    page: int = 1,
    limit: int = 20,
    status: Optional[ComplaintStatus] = None,
    category_id: Optional[int] = None,
) -> PaginatedComplaintResponse:
    """Get employee's submitted complaints."""
    employee = db.scalar(select(Employee).where(Employee.user_id == user_id))
    if not employee:
        return PaginatedComplaintResponse(items=[], total=0, page=page, limit=limit, pages=1)

    stmt = select(Complaint).where(Complaint.employee_id == employee.id)

    if status:
        stmt = stmt.where(Complaint.status == status)
    if category_id:
        stmt = stmt.where(Complaint.category_id == category_id)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    pages = math.ceil(total / limit) if total > 0 else 1

    complaints = db.scalars(
        stmt.order_by(Complaint.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    ).all()

    items = [build_complaint_response(c) for c in complaints]
    return PaginatedComplaintResponse(items=items, total=total, page=page, limit=limit, pages=pages)


def get_my_complaint_by_id(
    db: Session,
    user_id: int,
    complaint_id: int,
) -> ComplaintResponse:
    """Get employee's complaint details with IDOR protection."""
    employee = db.scalar(select(Employee).where(Employee.user_id == user_id))
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found.",
        )

    complaint = db.get(Complaint, complaint_id)
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found.",
        )

    # IDOR check: Verify employee ownership
    if complaint.employee_id != employee.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You can only view your own complaints.",
        )

    return build_complaint_response(complaint)


# ============================================================
# HR COMPLAINT OPERATIONS
# ============================================================

def get_all_complaints_hr(
    db: Session,
    page: int = 1,
    limit: int = 20,
    status: Optional[ComplaintStatus] = None,
    priority: Optional[ComplaintPriority] = None,
    category_id: Optional[int] = None,
    employee_id: Optional[int] = None,
    search: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
) -> PaginatedComplaintResponse:
    """Get all complaints across the organization for HR."""
    stmt = select(Complaint).join(Employee, Complaint.employee_id == Employee.id)

    if status:
        stmt = stmt.where(Complaint.status == status)
    if priority:
        stmt = stmt.where(Complaint.priority == priority)
    if category_id:
        stmt = stmt.where(Complaint.category_id == category_id)
    if employee_id:
        stmt = stmt.where(Complaint.employee_id == employee_id)
    if from_date:
        stmt = stmt.where(Complaint.created_at >= datetime.combine(from_date, datetime.min.time(), tzinfo=timezone.utc))
    if to_date:
        stmt = stmt.where(Complaint.created_at <= datetime.combine(to_date, datetime.max.time(), tzinfo=timezone.utc))

    if search and search.strip():
        term = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Complaint.complaint_code.ilike(term),
                Complaint.subject.ilike(term),
                Complaint.description.ilike(term),
                Employee.first_name.ilike(term),
                Employee.last_name.ilike(term),
                Employee.employee_code.ilike(term),
            )
        )

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    pages = math.ceil(total / limit) if total > 0 else 1

    complaints = db.scalars(
        stmt.order_by(Complaint.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    ).all()

    items = [build_complaint_response(c) for c in complaints]
    return PaginatedComplaintResponse(items=items, total=total, page=page, limit=limit, pages=pages)


def get_complaint_by_id_hr(
    db: Session,
    complaint_id: int,
) -> ComplaintResponse:
    """Get complaint details for HR."""
    complaint = db.get(Complaint, complaint_id)
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found.",
        )
    return build_complaint_response(complaint)


def validate_status_transition(current_status: ComplaintStatus, target_status: ComplaintStatus):
    """Validate allowed complaint status transitions."""
    if current_status == target_status:
        return

    allowed_transitions = {
        ComplaintStatus.OPEN: {ComplaintStatus.UNDER_REVIEW, ComplaintStatus.REJECTED},
        ComplaintStatus.UNDER_REVIEW: {ComplaintStatus.IN_PROGRESS, ComplaintStatus.REJECTED},
        ComplaintStatus.IN_PROGRESS: {ComplaintStatus.RESOLVED},
        ComplaintStatus.RESOLVED: {ComplaintStatus.CLOSED},
        ComplaintStatus.CLOSED: set(),
        ComplaintStatus.REJECTED: set(),
    }

    allowed = allowed_transitions.get(current_status, set())
    if target_status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status transition from '{current_status.value}' to '{target_status.value}'.",
        )


def update_status_hr(
    db: Session,
    complaint_id: int,
    new_status: ComplaintStatus,
    current_hr: User,
    ip_address: Optional[str] = None,
) -> ComplaintResponse:
    """Update complaint status (HR)."""
    complaint = db.get(Complaint, complaint_id)
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found.",
        )

    validate_status_transition(complaint.status, new_status)

    complaint.status = new_status
    complaint.updated_at = datetime.now(timezone.utc)

    if new_status == ComplaintStatus.RESOLVED:
        complaint.resolved_at = datetime.now(timezone.utc)
    elif new_status == ComplaintStatus.CLOSED:
        complaint.closed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(complaint)

    # Log Audit Action
    audit_act = AuditAction.COMPLAINT_REJECTED if new_status == ComplaintStatus.REJECTED else AuditAction.COMPLAINT_STATUS_UPDATED
    create_audit_log(
        db=db,
        action=audit_act,
        user_id=current_hr.id,
        ip_address=ip_address,
    )

    # Notify Employee
    if complaint.employee and complaint.employee.user_id:
        create_notification(
            db=db,
            user_id=complaint.employee.user_id,
            title=f"Complaint [{complaint.complaint_code}] Status Updated",
            message=f"The status of your complaint [{complaint.complaint_code}] has been changed to '{new_status.value}'.",
            notification_type=NotificationType.COMPLAINT_UPDATED,
            reference_id=str(complaint.id),
            reference_type="complaint",
        )

    return build_complaint_response(complaint)


def update_priority_hr(
    db: Session,
    complaint_id: int,
    new_priority: ComplaintPriority,
    current_hr: User,
    ip_address: Optional[str] = None,
) -> ComplaintResponse:
    """Update complaint priority (HR)."""
    complaint = db.get(Complaint, complaint_id)
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found.",
        )

    complaint.priority = new_priority
    complaint.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(complaint)

    create_audit_log(
        db=db,
        action=AuditAction.COMPLAINT_PRIORITY_UPDATED,
        user_id=current_hr.id,
        ip_address=ip_address,
    )

    return build_complaint_response(complaint)


def respond_complaint_hr(
    db: Session,
    complaint_id: int,
    hr_response: str,
    current_hr: User,
    ip_address: Optional[str] = None,
) -> ComplaintResponse:
    """Add HR response to complaint (HR)."""
    complaint = db.get(Complaint, complaint_id)
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found.",
        )

    clean_resp = hr_response.strip()
    if not clean_resp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="HR response cannot be empty.",
        )

    complaint.hr_response = clean_resp
    complaint.updated_at = datetime.now(timezone.utc)

    # Auto transition to UNDER_REVIEW if currently OPEN
    if complaint.status == ComplaintStatus.OPEN:
        complaint.status = ComplaintStatus.UNDER_REVIEW

    db.commit()
    db.refresh(complaint)

    create_audit_log(
        db=db,
        action=AuditAction.COMPLAINT_RESPONDED,
        user_id=current_hr.id,
        ip_address=ip_address,
    )

    # Notify Employee
    if complaint.employee and complaint.employee.user_id:
        create_notification(
            db=db,
            user_id=complaint.employee.user_id,
            title=f"HR Responded to Complaint [{complaint.complaint_code}]",
            message=f"HR has provided an update/response to your complaint [{complaint.complaint_code}].",
            notification_type=NotificationType.COMPLAINT_UPDATED,
            reference_id=str(complaint.id),
            reference_type="complaint",
        )

    return build_complaint_response(complaint)


def resolve_complaint_hr(
    db: Session,
    complaint_id: int,
    resolution: str,
    current_hr: User,
    ip_address: Optional[str] = None,
) -> ComplaintResponse:
    """Resolve a complaint (HR)."""
    complaint = db.get(Complaint, complaint_id)
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found.",
        )

    if complaint.status in (ComplaintStatus.CLOSED, ComplaintStatus.REJECTED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot resolve a complaint that is in '{complaint.status.value}' status.",
        )

    clean_res = resolution.strip()
    if not clean_res:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resolution details cannot be empty.",
        )

    complaint.resolution = clean_res
    complaint.status = ComplaintStatus.RESOLVED
    complaint.resolved_at = datetime.now(timezone.utc)
    complaint.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(complaint)

    create_audit_log(
        db=db,
        action=AuditAction.COMPLAINT_RESOLVED,
        user_id=current_hr.id,
        ip_address=ip_address,
    )

    # Notify Employee
    if complaint.employee and complaint.employee.user_id:
        create_notification(
            db=db,
            user_id=complaint.employee.user_id,
            title=f"Complaint [{complaint.complaint_code}] Resolved",
            message=f"Your complaint [{complaint.complaint_code}] has been resolved by HR.",
            notification_type=NotificationType.COMPLAINT_RESOLVED,
            reference_id=str(complaint.id),
            reference_type="complaint",
        )

    return build_complaint_response(complaint)


def close_complaint_hr(
    db: Session,
    complaint_id: int,
    current_hr: User,
    ip_address: Optional[str] = None,
) -> ComplaintResponse:
    """Close a resolved complaint (HR)."""
    complaint = db.get(Complaint, complaint_id)
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found.",
        )

    if complaint.status != ComplaintStatus.RESOLVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only resolved complaints can be closed. Current status: '{complaint.status.value}'.",
        )

    complaint.status = ComplaintStatus.CLOSED
    complaint.closed_at = datetime.now(timezone.utc)
    complaint.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(complaint)

    create_audit_log(
        db=db,
        action=AuditAction.COMPLAINT_CLOSED,
        user_id=current_hr.id,
        ip_address=ip_address,
    )

    return build_complaint_response(complaint)
