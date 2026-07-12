import logging
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger("email_service")

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "no-reply@example.com")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


def _send_email(to_email: str, subject: str, plain_body: str, html_body: str, log_link: str) -> None:
    # No SMTP server configured (e.g. local dev) - log the link instead of sending.
    if not SMTP_HOST:
        logger.warning(
            "SMTP not configured; skipping send. Link for %s: %s",
            to_email, log_link
        )
        return

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = SMTP_FROM_EMAIL
    message["To"] = to_email
    message.attach(MIMEText(plain_body, "plain"))
    message.attach(MIMEText(html_body, "html"))

    logger.info("Sending email (%s) to %s via %s:%s", subject, to_email, SMTP_HOST, SMTP_PORT)
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            if SMTP_USERNAME and SMTP_PASSWORD:
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM_EMAIL, to_email, message.as_string())
    except smtplib.SMTPException:
        logger.exception("Failed to send email (%s) to %s", subject, to_email)
        raise
    else:
        logger.info("Email (%s) sent to %s", subject, to_email)


def send_verification_email(to_email: str, token: str) -> None:
    verification_link = f"{FRONTEND_URL}/verify-email?token={token}"
    _send_email(
        to_email=to_email,
        subject="Verify your email address",
        plain_body=f"Welcome! Please verify your email address by clicking the link below:\n\n{verification_link}\n\nThis link expires in 24 hours.",
        html_body=(
            f'<p>Welcome! Please verify your email address by clicking the link below:</p>'
            f'<p><a href="{verification_link}">Verify Email Address</a></p>'
            f'<p>This link expires in 24 hours.</p>'
        ),
        log_link=verification_link,
    )


def send_password_reset_email(to_email: str, token: str) -> None:
    reset_link = f"{FRONTEND_URL}/reset-password?token={token}"
    _send_email(
        to_email=to_email,
        subject="Reset your password",
        plain_body=f"We received a request to reset your password. Click the link below to choose a new one:\n\n{reset_link}\n\nThis link expires in 1 hour. If you didn't request this, you can safely ignore this email.",
        html_body=(
            f'<p>We received a request to reset your password. Click the link below to choose a new one:</p>'
            f'<p><a href="{reset_link}">Reset Password</a></p>'
            f'<p>This link expires in 1 hour. If you didn\'t request this, you can safely ignore this email.</p>'
        ),
        log_link=reset_link,
    )


def send_follow_notification_email(to_email: str, from_username: str) -> None:
    app_link = f"{FRONTEND_URL}/login?force_logout=1"
    _send_email(
        to_email=to_email,
        subject=f"{from_username} wants to connect with you",
        plain_body=f"{from_username} added you as a friend on TripPlanner. Log in to see their trips and connect back:\n\n{app_link}",
        html_body=(
            f'<p><strong>{from_username}</strong> added you as a friend on TripPlanner. '
            f'Log in to see their trips and connect back:</p>'
            f'<p><a href="{app_link}">Log In to TripPlanner</a></p>'
        ),
        log_link=app_link,
    )


def send_trip_member_added_email(to_email: str, from_username: str, trip_name: str) -> None:
    app_link = f"{FRONTEND_URL}/login?force_logout=1"
    _send_email(
        to_email=to_email,
        subject=f"{from_username} added you to \"{trip_name}\"",
        plain_body=f"{from_username} added you to the trip \"{trip_name}\" on TripPlanner. Log in to see the details:\n\n{app_link}",
        html_body=(
            f'<p><strong>{from_username}</strong> added you to the trip <strong>{trip_name}</strong> on TripPlanner. '
            f'Log in to see the details:</p>'
            f'<p><a href="{app_link}">View Trip Details</a></p>'
        ),
        log_link=app_link,
    )


def send_invite_email(to_email: str, from_username: str) -> None:
    app_link = f"{FRONTEND_URL}/login?force_logout=1"
    _send_email(
        to_email=to_email,
        subject=f"{from_username} invited you to TripPlanner",
        plain_body=f"{from_username} wants to plan trips with you on TripPlanner. Create an account to get started:\n\n{app_link}",
        html_body=(
            f'<p><strong>{from_username}</strong> wants to plan trips with you on TripPlanner. '
            f'Create an account to get started:</p>'
            f'<p><a href="{app_link}">Create Your Account</a></p>'
        ),
        log_link=app_link,
    )
