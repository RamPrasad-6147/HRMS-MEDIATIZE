from email.message import EmailMessage
from pathlib import Path
import smtplib
from typing import Optional

from app.core.config import settings


TEMPLATE_DIR = Path(__file__).resolve().parent / "templates"


def load_template(template_name: str) -> str:
    """
    Load an HTML email template from the templates directory.
    """
    template_path = TEMPLATE_DIR / template_name

    if not template_path.exists():
        raise FileNotFoundError(
            f"Email template not found: {template_path}"
        )

    return template_path.read_text(encoding="utf-8")


def send_email(
    recipient_email: str,
    subject: str,
    html_content: str,
    plain_text_content: str,
) -> None:
    """
    Send an email using the configured SMTP server.

    The email contains both:
    - Plain-text version
    - HTML version

    The HTML version will be preferred by email clients
    that support HTML emails.
    """

    message = EmailMessage()

    message["From"] = (
        f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM}>"
    )
    message["To"] = recipient_email
    message["Subject"] = subject

    # Plain-text fallback
    message.set_content(plain_text_content)

    # HTML version
    message.add_alternative(
        html_content,
        subtype="html",
    )

    # Connect to SMTP server
    with smtplib.SMTP(
        settings.SMTP_HOST,
        settings.SMTP_PORT,
        timeout=30,
    ) as smtp:

        # Identify ourselves to the SMTP server
        smtp.ehlo()

        # Upgrade connection to TLS
        smtp.starttls()

        # Identify ourselves again after TLS
        smtp.ehlo()

        # Authenticate with SMTP credentials
        smtp.login(
            settings.SMTP_USERNAME,
            settings.SMTP_PASSWORD,
        )

        # Send the email
        smtp.send_message(message)


def send_otp_email(
    recipient_email: str,
    otp_code: str,
    employee_name: str,
    expire_minutes: int = 10,
) -> None:
    """
    Send a 6-digit login verification code email to a user.
    """

    template = load_template("otp_email.html")

    clean_name = (
        employee_name.strip()
        if employee_name and employee_name.strip()
        else "User"
    )

    html_content = (
        template
        .replace("{{ employee_name }}", clean_name)
        .replace("{{ otp_code }}", otp_code)
        .replace("{{ expire_minutes }}", str(expire_minutes))
    )

    plain_text_content = f"""
Hello {clean_name},

Your Mediatize Tech HRMS login verification code is:

{otp_code}

This code is valid for {expire_minutes} minutes.

For your security, do not share this code with anyone.

If you did not request this code, please ignore this email.

Regards,
Mediatize Tech HRMS
Mediatize Tech Pvt. Ltd.
""".strip()

    send_email(
        recipient_email=recipient_email,
        subject="[HRMS] Your Login Verification Code",
        html_content=html_content,
        plain_text_content=plain_text_content,
    )


def send_email_change_otp_email(
    recipient_email: str,
    otp_code: str,
    employee_name: str,
    expire_minutes: int = 10,
) -> None:
    """
    Send a 6-digit email change verification code email to a user's new email.
    """

    template = load_template("email_change_otp.html")

    clean_name = (
        employee_name.strip()
        if employee_name and employee_name.strip()
        else "User"
    )

    html_content = (
        template
        .replace("{{ employee_name }}", clean_name)
        .replace("{{ otp_code }}", otp_code)
        .replace("{{ expire_minutes }}", str(expire_minutes))
    )

    plain_text_content = f"""
Hello {clean_name},

A request was made to change the email address associated with your HRMS account.
Your 6-digit email change verification code is:

{otp_code}

This code is valid for {expire_minutes} minutes.

For your security, do not share this code with anyone.
The email address will only change after successful OTP verification.

If you did not request this change, please contact HR or system administration.

Regards,
Mediatize Tech HRMS
Mediatize Tech Pvt. Ltd.
""".strip()

    send_email(
        recipient_email=recipient_email,
        subject="[HRMS] Verify Your New Email Address",
        html_content=html_content,
        plain_text_content=plain_text_content,
    )


def send_employee_welcome_email(
    recipient_email: str,
    employee_name: str,
    login_url: str,
    employee_code: str = "",
) -> None:
    """
    Send a professional HTML welcome email to a newly created employee.

    HRMS authentication is passwordless.
    Employees log in using their registered email address
    and a one-time verification code sent by email.
    """

    template = load_template("employee_welcome.html")

    clean_name = (
        employee_name.strip()
        if employee_name and employee_name.strip()
        else "Employee"
    )

    clean_url = (
        login_url.strip()
        if login_url and login_url.strip()
        else settings.FRONTEND_URL
    )

    clean_employee_code = employee_code or "N/A"

    html_content = (
        template
        .replace("{{ employee_name }}", clean_name)
        .replace("{{ employee_email }}", recipient_email)
        .replace("{{ login_url }}", clean_url)
        .replace("{{ employee_code }}", clean_employee_code)
    )

    plain_text_content = f"""
Welcome to Mediatize Tech!

Hello {clean_name},

Your employee account has been successfully created
in the Mediatize Tech HRMS.

ACCOUNT DETAILS

Employee Code:
{clean_employee_code}

Registered Email:
{recipient_email}

HOW TO SIGN IN

1. Open the Mediatize Tech HRMS portal.
2. Enter your registered email address.
3. Request a login verification code.
4. Enter the 6-digit OTP sent to your email.
5. You will be securely signed in to HRMS.

Login to HRMS:
{clean_url}

Important:
Your HRMS account does not use a password.
A new verification code is sent to your registered email
whenever you sign in.

If you did not expect this account, please contact HR.

Regards,
Mediatize Tech HRMS
Mediatize Tech Pvt. Ltd.
""".strip()

    send_email(
        recipient_email=recipient_email,
        subject="Welcome to Mediatize Tech HRMS — Your Account Details",
        html_content=html_content,
        plain_text_content=plain_text_content,
    )


def send_project_assignment_email(
    recipient_email: str,
    employee_name: str,
    project_name: str,
    project_role: str,
    project_description: Optional[str] = None,
    start_date: Optional[str] = None,
    assigned_date: Optional[str] = None,
    assigned_by_name: Optional[str] = None,
    login_url: Optional[str] = None,
) -> None:
    """
    Send a professional HTML project assignment email
    to an assigned employee.
    """

    template = load_template("project_assignment.html")

    clean_name = (
        employee_name.strip()
        if employee_name and employee_name.strip()
        else "Team Member"
    )

    clean_desc = (
        project_description.strip()
        if project_description and project_description.strip()
        else "No description provided."
    )

    clean_url = (
        login_url.strip()
        if login_url and login_url.strip()
        else settings.FRONTEND_URL
    )

    html_content = (
        template
        .replace("{{ employee_name }}", clean_name)
        .replace("{{ project_name }}", project_name or "N/A")
        .replace("{{ project_role }}", project_role or "N/A")
        .replace("{{ project_description }}", clean_desc)
        .replace("{{ start_date }}", start_date or "N/A")
        .replace("{{ assigned_date }}", assigned_date or "N/A")
        .replace(
            "{{ assigned_by_name }}",
            assigned_by_name or "HR Department",
        )
        .replace("{{ login_url }}", clean_url)
    )

    plain_text_content = f"""
Hello {clean_name},

You have been assigned to a project on Mediatize Tech HRMS.

PROJECT ASSIGNMENT DETAILS:

Project Name:
{project_name or "N/A"}

Project Role:
{project_role or "N/A"}

Assignment Date:
{assigned_date or "N/A"}

Project Start Date:
{start_date or "N/A"}

Assigned By:
{assigned_by_name or "HR Department"}

Description:
{clean_desc}

Log in to HRMS:
{clean_url}

Regards,
Mediatize Tech HRMS
Mediatize Tech Pvt. Ltd.
""".strip()

    send_email(
        recipient_email=recipient_email,
        subject="You have been assigned to a project",
        html_content=html_content,
        plain_text_content=plain_text_content,
    )


def send_announcement_email(
    recipient_email: str,
    employee_name: str,
    announcement_title: str,
    announcement_content: str,
    announcement_scope: str,
    project_name: Optional[str] = None,
    published_date: Optional[str] = None,
    login_url: Optional[str] = None,
) -> None:
    """
    Send a professional HTML announcement email
    for Company or Project announcements.
    """

    template = load_template("announcement.html")

    clean_name = (
        employee_name.strip()
        if employee_name and employee_name.strip()
        else "Team Member"
    )

    clean_url = (
        login_url.strip()
        if login_url and login_url.strip()
        else settings.FRONTEND_URL
    )

    is_project = announcement_scope.upper() == "PROJECT"

    scope_label = (
        f"Project Announcement • {project_name}"
        if (is_project and project_name)
        else "Company Announcement"
    )

    subject = (
        "[HRMS] New Project Announcement"
        if (is_project and project_name)
        else "[HRMS] New Company Announcement"
    )

    project_row = ""

    if is_project and project_name:
        project_row = (
            "<tr>"
            '<td style="font-size: 13px; color: #6b7280; '
            'width: 110px; font-weight: 600; padding-top: 6px;">'
            "Project:"
            "</td>"
            f'<td style="font-size: 13px; color: #111827; '
            f'font-weight: 600; padding-top: 6px;">'
            f"{project_name}"
            "</td>"
            "</tr>"
        )

    html_content = (
        template
        .replace("{{ announcement_scope_label }}", scope_label)
        .replace(
            "{{ announcement_title }}",
            announcement_title or "HRMS Announcement",
        )
        .replace("{{ employee_name }}", clean_name)
        .replace(
            "{{ published_date }}",
            published_date or "N/A",
        )
        .replace("{{ project_info_row }}", project_row)
        .replace(
            "{{ announcement_content }}",
            announcement_content or "",
        )
        .replace("{{ login_url }}", clean_url)
    )

    project_text = (
        f"Project: {project_name}\n"
        if (is_project and project_name)
        else ""
    )

    plain_text_content = f"""
Hello {clean_name},

[{scope_label.upper()}]

Title:
{announcement_title}

Published Date:
{published_date or "N/A"}

{project_text}
Content:
{announcement_content}

View in HRMS:
{clean_url}

Regards,
Mediatize Tech HRMS
Mediatize Tech Pvt. Ltd.
""".strip()

    send_email(
        recipient_email=recipient_email,
        subject=subject,
        html_content=html_content,
        plain_text_content=plain_text_content,
    )


def send_performance_feedback_email(
    recipient_email: str,
    employee_name: str,
    review_period: str,
    overall_rating: float,
    overall_feedback: Optional[str] = None,
    review_date: Optional[str] = None,
    login_url: Optional[str] = None,
) -> None:
    """
    Send a professional HTML email when performance feedback
    is finalized.
    """

    template = load_template("performance_feedback.html")

    clean_name = (
        employee_name.strip()
        if employee_name and employee_name.strip()
        else "Team Member"
    )

    clean_feedback = (
        overall_feedback.strip()
        if overall_feedback and overall_feedback.strip()
        else "No additional comments provided."
    )

    clean_url = (
        login_url.strip()
        if login_url and login_url.strip()
        else settings.FRONTEND_URL
    )

    html_content = (
        template
        .replace("{{ employee_name }}", clean_name)
        .replace("{{ review_period }}", review_period or "N/A")
        .replace(
            "{{ overall_rating }}",
            f"{overall_rating:.1f}",
        )
        .replace(
            "{{ review_date }}",
            review_date or "N/A",
        )
        .replace(
            "{{ overall_feedback }}",
            clean_feedback,
        )
        .replace("{{ login_url }}", clean_url)
    )

    plain_text_content = f"""
Hello {clean_name},

Your performance evaluation has been finalized
on Mediatize Tech HRMS.

PERFORMANCE EVALUATION DETAILS:

Review Period:
{review_period or "N/A"}

Overall Rating:
{overall_rating:.1f} / 5.0

Review Date:
{review_date or "N/A"}

HR Feedback:
{clean_feedback}

View details in HRMS:
{clean_url}

Regards,
Mediatize Tech HRMS
Mediatize Tech Pvt. Ltd.
""".strip()

    send_email(
        recipient_email=recipient_email,
        subject="[HRMS] Your Performance Feedback",
        html_content=html_content,
        plain_text_content=plain_text_content,
    )


def send_leave_request_email(
    recipient_email: str,
    employee_name: str,
    leave_type: str,
    start_date: str,
    end_date: str,
    duration: str,
    reason: Optional[str] = None,
    login_url: Optional[str] = None,
) -> None:
    """
    Send a professional HTML email to HR
    when a leave request is submitted.
    """

    template = load_template("leave_request.html")

    clean_reason = (
        reason.strip()
        if reason and reason.strip()
        else "No reason provided."
    )

    clean_url = (
        login_url.strip()
        if login_url and login_url.strip()
        else settings.FRONTEND_URL
    )

    html_content = (
        template
        .replace(
            "{{ employee_name }}",
            employee_name or "Employee",
        )
        .replace(
            "{{ leave_type }}",
            leave_type or "N/A",
        )
        .replace(
            "{{ start_date }}",
            start_date or "N/A",
        )
        .replace(
            "{{ end_date }}",
            end_date or "N/A",
        )
        .replace(
            "{{ duration }}",
            str(duration),
        )
        .replace(
            "{{ reason }}",
            clean_reason,
        )
        .replace(
            "{{ login_url }}",
            clean_url,
        )
    )

    plain_text_content = f"""
Hello HR Team,

A new leave request has been submitted by {employee_name}.

LEAVE REQUEST DETAILS:

Employee:
{employee_name}

Leave Type:
{leave_type}

Dates:
{start_date} to {end_date} ({duration} day(s))

Reason:
{clean_reason}

Review in HRMS:
{clean_url}

Regards,
Mediatize Tech HRMS
Mediatize Tech Pvt. Ltd.
""".strip()

    send_email(
        recipient_email=recipient_email,
        subject="[HRMS] New Leave Request",
        html_content=html_content,
        plain_text_content=plain_text_content,
    )


def send_leave_approved_email(
    recipient_email: str,
    employee_name: str,
    leave_type: str,
    start_date: str,
    end_date: str,
    duration: str,
    hr_remarks: Optional[str] = None,
    login_url: Optional[str] = None,
) -> None:
    """
    Send a professional HTML email to an employee
    when a leave request is approved.
    """

    template = load_template("leave_approved.html")

    clean_name = (
        employee_name.strip()
        if employee_name and employee_name.strip()
        else "Team Member"
    )

    clean_remarks = (
        hr_remarks.strip()
        if hr_remarks and hr_remarks.strip()
        else "Approved"
    )

    clean_url = (
        login_url.strip()
        if login_url and login_url.strip()
        else settings.FRONTEND_URL
    )

    html_content = (
        template
        .replace("{{ employee_name }}", clean_name)
        .replace("{{ leave_type }}", leave_type or "N/A")
        .replace("{{ start_date }}", start_date or "N/A")
        .replace("{{ end_date }}", end_date or "N/A")
        .replace("{{ duration }}", str(duration))
        .replace(
            "{{ hr_remarks }}",
            clean_remarks,
        )
        .replace(
            "{{ login_url }}",
            clean_url,
        )
    )

    plain_text_content = f"""
Hello {clean_name},

Your leave request has been APPROVED.

APPROVED LEAVE DETAILS:

Leave Type:
{leave_type}

Dates:
{start_date} to {end_date} ({duration} day(s))

HR Remarks:
{clean_remarks}

View details in HRMS:
{clean_url}

Regards,
Mediatize Tech HRMS
Mediatize Tech Pvt. Ltd.
""".strip()

    send_email(
        recipient_email=recipient_email,
        subject="[HRMS] Leave Request Approved",
        html_content=html_content,
        plain_text_content=plain_text_content,
    )


def send_leave_rejected_email(
    recipient_email: str,
    employee_name: str,
    leave_type: str,
    start_date: str,
    end_date: str,
    hr_remarks: Optional[str] = None,
    login_url: Optional[str] = None,
) -> None:
    """
    Send a professional HTML email to an employee
    when a leave request is rejected.
    """

    template = load_template("leave_rejected.html")

    clean_name = (
        employee_name.strip()
        if employee_name and employee_name.strip()
        else "Team Member"
    )

    clean_remarks = (
        hr_remarks.strip()
        if hr_remarks and hr_remarks.strip()
        else "No remarks provided."
    )

    clean_url = (
        login_url.strip()
        if login_url and login_url.strip()
        else settings.FRONTEND_URL
    )

    html_content = (
        template
        .replace("{{ employee_name }}", clean_name)
        .replace("{{ leave_type }}", leave_type or "N/A")
        .replace("{{ start_date }}", start_date or "N/A")
        .replace("{{ end_date }}", end_date or "N/A")
        .replace(
            "{{ hr_remarks }}",
            clean_remarks,
        )
        .replace(
            "{{ login_url }}",
            clean_url,
        )
    )

    plain_text_content = f"""
Hello {clean_name},

Your leave request update: REJECTED.

LEAVE REQUEST DETAILS:

Leave Type:
{leave_type}

Dates:
{start_date} to {end_date}

HR Remarks:
{clean_remarks}

View details in HRMS:
{clean_url}

Regards,
Mediatize Tech HRMS
Mediatize Tech Pvt. Ltd.
""".strip()

    send_email(
        recipient_email=recipient_email,
        subject="[HRMS] Leave Request Update",
        html_content=html_content,
        plain_text_content=plain_text_content,
    )