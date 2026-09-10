from datetime import date, datetime, timezone
from math import ceil
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import desc, func, or_, select
from sqlalchemy.orm import Session

from app.audit_service.models import AuditAction
from app.audit_service.service import create_audit_log
from app.authentication_service.models import User
from app.cloudinary_service.service import upload_document, validate_document_file
from app.employee_service.models import Employee
from app.project_service.models import AssignmentStatus, Project, ProjectAssignment, ProjectRole
from app.work_report_service.models import DailyWorkReport
from app.work_report_service.schemas import (
    AssignedProjectResponse,
    PaginatedWorkReportResponse,
    WorkReportResponse,
)


def get_current_employee_record(db: Session, user_id: int) -> Employee:
    """
    Helper function to look up Employee record associated with current authenticated user.
    """
    stmt = select(Employee).where(Employee.user_id == user_id)
    emp = db.scalar(stmt)
    if not emp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee profile not found for this user.",
        )
    return emp


def format_report_response(report: DailyWorkReport) -> WorkReportResponse:
    """
    Format DailyWorkReport ORM model into Pydantic WorkReportResponse.
    """
    emp_name = None
    emp_code = None
    if report.employee:
        emp_name = f"{report.employee.first_name} {report.employee.last_name}".strip()
        emp_code = report.employee.employee_code

    proj_name = None
    proj_code = None
    if report.project:
        proj_name = report.project.name
        proj_code = report.project.project_code

    return WorkReportResponse(
        id=report.id,
        employee_id=report.employee_id,
        employee_name=emp_name,
        employee_code=emp_code,
        project_id=report.project_id,
        project_name=proj_name,
        project_code=proj_code,
        work_description=report.work_description,
        problems_faced=report.problems_faced,
        document_url=report.document_url,
        document_public_id=report.document_public_id,
        document_name=report.document_name,
        report_date=report.report_date,
        created_at=report.created_at,
        updated_at=report.updated_at,
    )


def get_assigned_projects_for_employee(
    db: Session,
    user_id: int,
) -> List[AssignedProjectResponse]:
    """
    Fetch all active project assignments for the logged-in employee.
    """
    emp = get_current_employee_record(db, user_id)

    stmt = (
        select(ProjectAssignment)
        .join(Project, ProjectAssignment.project_id == Project.id)
        .outerjoin(ProjectRole, ProjectAssignment.project_role_id == ProjectRole.id)
        .where(
            ProjectAssignment.employee_id == emp.id,
            ProjectAssignment.status == AssignmentStatus.ACTIVE,
            Project.deleted_at.is_(None),
        )
        .order_by(Project.name.asc())
    )

    assignments = db.scalars(stmt).all()

    res = []
    for pa in assignments:
        role_title = pa.project_role.name if pa.project_role else "Member"
        res.append(
            AssignedProjectResponse(
                project_id=pa.project_id,
                project_name=pa.project.name,
                project_code=pa.project.project_code,
                role_name=role_title,
            )
        )

    return res


async def create_work_report(
    db: Session,
    current_user: User,
    project_id: int,
    work_description: str,
    problems_faced: Optional[str] = None,
    document_file: Optional[UploadFile] = None,
    ip_address: Optional[str] = None,
) -> WorkReportResponse:
    """
    Create a new daily work report for an assigned project.

    Rules:
    - Employee derived from JWT current_user.
    - Employee MUST have ACTIVE ProjectAssignment for the project (403 Forbidden if not).
    - Report date is generated server-side (date.today()).
    - Duplicate check: unique (employee_id, project_id, report_date) -> 409 Conflict.
    - Optional Cloudinary document upload (fails safely if upload error).
    - Audit log entry created.
    """
    if not work_description or not work_description.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Work description cannot be empty or whitespace only.",
        )

    emp = get_current_employee_record(db, current_user.id)

    # 1. Validate active project assignment
    assign_stmt = select(ProjectAssignment).where(
        ProjectAssignment.employee_id == emp.id,
        ProjectAssignment.project_id == project_id,
        ProjectAssignment.status == AssignmentStatus.ACTIVE,
    )
    assignment = db.scalar(assign_stmt)

    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not actively assigned to this project.",
        )

    # 2. Server-side report date generation
    report_date = date.today()

    # 3. Duplicate check
    dup_stmt = select(DailyWorkReport).where(
        DailyWorkReport.employee_id == emp.id,
        DailyWorkReport.project_id == project_id,
        DailyWorkReport.report_date == report_date,
    )
    existing = db.scalar(dup_stmt)

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already submitted a work report for this project today.",
        )

    # 4. Handle optional document upload
    doc_url = None
    doc_public_id = None
    doc_name = None

    if document_file and document_file.filename:
        file_bytes = await document_file.read()
        validate_document_file(document_file, file_bytes)
        upload_res = upload_document(
            file_bytes,
            document_file.filename,
            folder="hrms/work_reports",
        )
        doc_url = upload_res.get("url")
        doc_public_id = upload_res.get("public_id")
        doc_name = document_file.filename

    # 5. Create report record
    report = DailyWorkReport(
        employee_id=emp.id,
        project_id=project_id,
        work_description=work_description.strip(),
        problems_faced=problems_faced.strip() if problems_faced and problems_faced.strip() else None,
        document_url=doc_url,
        document_public_id=doc_public_id,
        document_name=doc_name,
        report_date=report_date,
    )

    db.add(report)
    db.flush()

    # 6. Audit log
    create_audit_log(
        db,
        action=AuditAction.WORK_REPORT_CREATED,
        user_id=current_user.id,
        ip_address=ip_address,
    )

    db.commit()
    db.refresh(report)

    return format_report_response(report)


def get_my_work_reports(
    db: Session,
    user_id: int,
    page: int = 1,
    limit: int = 20,
    project_id: Optional[int] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
) -> PaginatedWorkReportResponse:
    """
    Get paginated work reports for the authenticated employee.
    """
    emp = get_current_employee_record(db, user_id)

    page = max(1, page)
    limit = max(1, min(100, limit))

    query = select(DailyWorkReport).where(DailyWorkReport.employee_id == emp.id)

    if project_id:
        query = query.where(DailyWorkReport.project_id == project_id)

    if from_date:
        query = query.where(DailyWorkReport.report_date >= from_date)

    if to_date:
        query = query.where(DailyWorkReport.report_date <= to_date)

    # Count total
    count_stmt = select(func.count()).select_from(query.subquery())
    total = db.scalar(count_stmt) or 0

    # Paginate
    offset = (page - 1) * limit
    stmt = (
        query.order_by(DailyWorkReport.report_date.desc(), DailyWorkReport.created_at.desc())
        .offset(offset)
        .limit(limit)
    )

    reports = db.scalars(stmt).all()
    items = [format_report_response(r) for r in reports]
    pages = ceil(total / limit) if total > 0 else 1

    return PaginatedWorkReportResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )


def get_my_work_report_by_id(
    db: Session,
    user_id: int,
    report_id: int,
) -> WorkReportResponse:
    """
    Get work report details for authenticated employee (enforces IDOR ownership).
    """
    emp = get_current_employee_record(db, user_id)

    stmt = select(DailyWorkReport).where(DailyWorkReport.id == report_id)
    report = db.scalar(stmt)

    if not report or report.employee_id != emp.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Work report not found.",
        )

    return format_report_response(report)


def get_all_work_reports_hr(
    db: Session,
    page: int = 1,
    limit: int = 20,
    employee_id: Optional[int] = None,
    project_id: Optional[int] = None,
    report_date: Optional[date] = None,
    search: Optional[str] = None,
) -> PaginatedWorkReportResponse:
    """
    HR endpoint: View all work reports across the organization with pagination and filters.
    """
    page = max(1, page)
    limit = max(1, min(100, limit))

    query = select(DailyWorkReport).join(Employee, DailyWorkReport.employee_id == Employee.id).join(Project, DailyWorkReport.project_id == Project.id)

    if employee_id:
        query = query.where(DailyWorkReport.employee_id == employee_id)

    if project_id:
        query = query.where(DailyWorkReport.project_id == project_id)

    if report_date:
        query = query.where(DailyWorkReport.report_date == report_date)

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.where(
            or_(
                Employee.first_name.ilike(search_pattern),
                Employee.last_name.ilike(search_pattern),
                Employee.employee_code.ilike(search_pattern),
                Project.name.ilike(search_pattern),
                Project.project_code.ilike(search_pattern),
                DailyWorkReport.work_description.ilike(search_pattern),
            )
        )

    count_stmt = select(func.count()).select_from(query.subquery())
    total = db.scalar(count_stmt) or 0

    offset = (page - 1) * limit
    stmt = (
        query.order_by(DailyWorkReport.report_date.desc(), DailyWorkReport.created_at.desc())
        .offset(offset)
        .limit(limit)
    )

    reports = db.scalars(stmt).all()
    items = [format_report_response(r) for r in reports]
    pages = ceil(total / limit) if total > 0 else 1

    return PaginatedWorkReportResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )


def get_work_report_by_id_hr(
    db: Session,
    report_id: int,
) -> WorkReportResponse:
    """
    HR endpoint: View details of any work report.
    """
    stmt = select(DailyWorkReport).where(DailyWorkReport.id == report_id)
    report = db.scalar(stmt)

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Work report not found.",
        )

    return format_report_response(report)


def get_todays_work_reports_hr(
    db: Session,
) -> Dict[str, Any]:
    """
    HR summary endpoint for HR Dashboard integration: Returns today's total report count & recent reports.
    """
    today_date = date.today()

    count_stmt = select(func.count(DailyWorkReport.id)).where(DailyWorkReport.report_date == today_date)
    today_count = db.scalar(count_stmt) or 0

    recent_stmt = (
        select(DailyWorkReport)
        .where(DailyWorkReport.report_date == today_date)
        .order_by(DailyWorkReport.created_at.desc())
        .limit(5)
    )
    recent_reports = db.scalars(recent_stmt).all()
    recent_items = [format_report_response(r) for r in recent_reports]

    return {
        "today_count": today_count,
        "recent_reports": recent_items,
    }
