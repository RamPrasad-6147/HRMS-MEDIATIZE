from unittest.mock import patch

from app.email_service.service import (
    send_announcement_email,
    send_otp_email,
    send_project_assignment_email,
)


@patch("app.email_service.service.send_email")
def test_send_otp_email(mock_send_email):
    recipient_email = "abc123@gmail.com"
    otp_code = "019284"
    employee_name = "John Doe"

    send_otp_email(
        recipient_email=recipient_email,
        otp_code=otp_code,
        employee_name=employee_name,
        expire_minutes=10,
    )

    mock_send_email.assert_called_once()

    call_kwargs = mock_send_email.call_args.kwargs

    # Verify recipient and subject
    assert call_kwargs["recipient_email"] == recipient_email
    assert call_kwargs["subject"] == (
        "[HRMS] Your Login Verification Code"
    )

    # Verify HTML email contains required information
    html_content = call_kwargs["html_content"]

    assert employee_name in html_content
    assert otp_code in html_content

    # Verify plain-text fallback contains required information
    plain_text_content = call_kwargs["plain_text_content"]

    assert employee_name in plain_text_content
    assert otp_code in plain_text_content


@patch("app.email_service.service.send_email")
def test_send_project_assignment_email(mock_send_email):
    recipient_email = "john.doe@mediatizetech.com"
    employee_name = "John Doe"
    project_name = "Alpha HRMS Portal"
    project_role = "Senior Frontend Engineer"
    project_description = "Internal HR dashboard redesign."
    start_date = "2026-10-01"
    assigned_date = "2026-09-05"
    assigned_by_name = "Jane HR Manager"
    login_url = "http://localhost:5173/login"

    send_project_assignment_email(
        recipient_email=recipient_email,
        employee_name=employee_name,
        project_name=project_name,
        project_role=project_role,
        project_description=project_description,
        start_date=start_date,
        assigned_date=assigned_date,
        assigned_by_name=assigned_by_name,
        login_url=login_url,
    )

    mock_send_email.assert_called_once()
    call_kwargs = mock_send_email.call_args.kwargs

    assert call_kwargs["recipient_email"] == recipient_email
    assert call_kwargs["subject"] == "You have been assigned to a project"

    html_content = call_kwargs["html_content"]
    assert employee_name in html_content
    assert project_name in html_content
    assert project_role in html_content
    assert project_description in html_content
    assert start_date in html_content
    assert assigned_date in html_content
    assert assigned_by_name in html_content
    assert login_url in html_content

    plain_text_content = call_kwargs["plain_text_content"]
    assert employee_name in plain_text_content
    assert project_name in plain_text_content
    assert project_role in plain_text_content


@patch("app.email_service.service.send_email")
def test_send_announcement_email_company(mock_send_email):
    recipient_email = "employee@mediatizetech.com"
    employee_name = "Alice Smith"
    announcement_title = "Annual Company Hackathon 2026"
    announcement_content = "Get ready for the annual 48-hour innovation hackathon!"
    announcement_scope = "COMPANY"
    published_date = "September 05, 2026"
    login_url = "http://localhost:5173/login"

    send_announcement_email(
        recipient_email=recipient_email,
        employee_name=employee_name,
        announcement_title=announcement_title,
        announcement_content=announcement_content,
        announcement_scope=announcement_scope,
        published_date=published_date,
        login_url=login_url,
    )

    mock_send_email.assert_called_once()
    call_kwargs = mock_send_email.call_args.kwargs

    assert call_kwargs["recipient_email"] == recipient_email
    assert call_kwargs["subject"] == "[HRMS] New Company Announcement"

    html_content = call_kwargs["html_content"]
    assert employee_name in html_content
    assert announcement_title in html_content
    assert announcement_content in html_content
    assert "Company Announcement" in html_content
    assert login_url in html_content


@patch("app.email_service.service.send_email")
def test_send_announcement_email_project(mock_send_email):
    recipient_email = "dev@mediatizetech.com"
    employee_name = "Bob Tech"
    announcement_title = "Sprint 14 Review Delayed"
    announcement_content = "Sprint review pushed back by 2 hours due to release deployment."
    announcement_scope = "PROJECT"
    project_name = "Mediatize HRMS"
    published_date = "September 05, 2026"
    login_url = "http://localhost:5173/login"

    send_announcement_email(
        recipient_email=recipient_email,
        employee_name=employee_name,
        announcement_title=announcement_title,
        announcement_content=announcement_content,
        announcement_scope=announcement_scope,
        project_name=project_name,
        published_date=published_date,
        login_url=login_url,
    )

    mock_send_email.assert_called_once()
    call_kwargs = mock_send_email.call_args.kwargs

    assert call_kwargs["recipient_email"] == recipient_email
    assert call_kwargs["subject"] == "[HRMS] New Project Announcement"

    html_content = call_kwargs["html_content"]
    assert employee_name in html_content
    assert announcement_title in html_content
    assert project_name in html_content
    assert "Project Announcement • Mediatize HRMS" in html_content