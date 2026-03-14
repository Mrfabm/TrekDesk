"""
Email service — uses stdlib smtplib so no extra dependencies are needed.

All public functions fail silently: a misconfigured / missing .env simply
means emails are skipped; the workflow continues normally.
"""

import smtplib
import logging
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional

logger = logging.getLogger(__name__)


def _cfg():
    """Return mail settings from config, or None if email is not configured."""
    try:
        from ..config import settings
        if not settings.MAIL_USERNAME or settings.MAIL_USERNAME == "your-email@example.com":
            return None
        return settings
    except Exception:
        return None


def send_email(
    to: str | List[str],
    subject: str,
    body_html: str,
    body_text: Optional[str] = None,
) -> bool:
    """
    Send an email synchronously.
    Returns True on success, False on any failure (never raises).
    """
    cfg = _cfg()
    if not cfg:
        logger.debug(f"Email skipped (not configured): {subject}")
        return False

    recipients = [to] if isinstance(to, str) else to
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = cfg.MAIL_FROM
        msg["To"] = ", ".join(recipients)

        if body_text:
            msg.attach(MIMEText(body_text, "plain"))
        msg.attach(MIMEText(body_html, "html"))

        if cfg.MAIL_SSL_TLS:
            server = smtplib.SMTP_SSL(cfg.MAIL_SERVER, cfg.MAIL_PORT, timeout=10)
        else:
            server = smtplib.SMTP(cfg.MAIL_SERVER, cfg.MAIL_PORT, timeout=10)
            if cfg.MAIL_STARTTLS:
                server.starttls()

        if cfg.USE_CREDENTIALS:
            server.login(cfg.MAIL_USERNAME, cfg.MAIL_PASSWORD)

        server.sendmail(cfg.MAIL_FROM, recipients, msg.as_string())
        server.quit()
        logger.info(f"Email sent → {recipients}: {subject}")
        return True
    except Exception as exc:
        logger.warning(f"Email failed ({subject}): {exc}")
        return False


async def send_email_async(
    to: str | List[str],
    subject: str,
    body_html: str,
    body_text: Optional[str] = None,
) -> bool:
    """Async wrapper — runs send_email in a thread so the event loop is not blocked."""
    return await asyncio.to_thread(send_email, to, subject, body_html, body_text)


# ---------------------------------------------------------------------------
# Workflow email helpers
# ---------------------------------------------------------------------------

def _html(title: str, body: str, color: str = "#2563eb") -> str:
    """Minimal branded HTML wrapper."""
    return f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <div style="background:{color};padding:16px 24px;border-radius:8px 8px 0 0;">
        <h2 style="color:#fff;margin:0;font-size:18px;">IMAi — {title}</h2>
      </div>
      <div style="background:#f9fafb;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
        {body}
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
        <p style="color:#9ca3af;font-size:12px;margin:0;">
          This is an automated message from the IMAi booking system. Please do not reply.
        </p>
      </div>
    </div>
    """


def email_booking_confirmed(to_email: str, booking_name: str, product: str, trek_date: str, people: int):
    body = f"""
    <p style="color:#374151;">Dear Agent,</p>
    <p style="color:#374151;">Your booking has been <strong>confirmed</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:6px 0;color:#6b7280;">Booking</td><td style="padding:6px 0;font-weight:600;color:#111827;">{booking_name}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Product</td><td style="padding:6px 0;color:#111827;">{product}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Trek Date</td><td style="padding:6px 0;color:#111827;">{trek_date}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Pax</td><td style="padding:6px 0;color:#111827;">{people}</td></tr>
    </table>
    <p style="color:#374151;">Please arrange payment within 7 days to secure your booking.</p>
    """
    send_email(to_email, f"Booking Confirmed — {booking_name}", _html("Booking Confirmed", body, "#16a34a"))


def email_payment_validated_ok(to_email: str, booking_name: str, amount: float, permit_type: str):
    body = f"""
    <p style="color:#374151;">Dear Agent,</p>
    <p style="color:#374151;">Payment for your booking has been <strong>validated</strong> by finance.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:6px 0;color:#6b7280;">Booking</td><td style="padding:6px 0;font-weight:600;color:#111827;">{booking_name}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Amount Received</td><td style="padding:6px 0;color:#111827;">${amount:,.2f}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Status</td><td style="padding:6px 0;color:#111827;">{permit_type.replace('_', ' ').title()}</td></tr>
    </table>
    <p style="color:#374151;">Permits will be purchased shortly. You will be notified when this is done.</p>
    """
    send_email(to_email, f"Payment Validated — {booking_name}", _html("Payment Validated", body, "#16a34a"))


def email_payment_do_not_purchase(to_email: str, booking_name: str, is_trusted: bool):
    if is_trusted:
        action = "Please submit an authorization request with proof of incoming payment."
        color = "#7c3aed"
        status = "Awaiting Authorization"
    else:
        action = "This is chase reminder 1 of 5. Please arrange payment within 7 days or your booking will be released."
        color = "#dc2626"
        status = "Chase Started"
    body = f"""
    <p style="color:#374151;">Dear Agent,</p>
    <p style="color:#374151;"><strong>No payment has been received</strong> for the following booking:</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:6px 0;color:#6b7280;">Booking</td><td style="padding:6px 0;font-weight:600;color:#111827;">{booking_name}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Status</td><td style="padding:6px 0;color:#111827;">{status}</td></tr>
    </table>
    <p style="color:#374151;">{action}</p>
    """
    send_email(to_email, f"Action Required — {booking_name}", _html("Action Required", body, color))


def email_chase_reminder(to_email: str, booking_name: str, chase_count: int, next_date: str):
    body = f"""
    <p style="color:#374151;">Dear Agent,</p>
    <p style="color:#374151;"><strong>Reminder {chase_count} of 5</strong> — payment has still not been received for the following booking:</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:6px 0;color:#6b7280;">Booking</td><td style="padding:6px 0;font-weight:600;color:#111827;">{booking_name}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Next reminder</td><td style="padding:6px 0;color:#111827;">{next_date}</td></tr>
    </table>
    <p style="color:#dc2626;font-weight:600;">If payment is not received after 5 reminders your booking will be automatically released.</p>
    """
    send_email(to_email, f"Payment Reminder {chase_count}/5 — {booking_name}", _html("Payment Reminder", body, "#ea580c"))


def email_booking_released(to_email: str, booking_name: str):
    body = f"""
    <p style="color:#374151;">Dear Agent,</p>
    <p style="color:#374151;">We regret to inform you that booking <strong>{booking_name}</strong> has been
    <strong style="color:#dc2626;">released</strong> due to non-payment after 5 reminders.</p>
    <p style="color:#374151;">If you still wish to proceed, please contact us to check availability and create a new booking.</p>
    """
    send_email(to_email, f"Booking Released — {booking_name}", _html("Booking Released", body, "#dc2626"))


def email_authorization_requested(to_email: str, booking_name: str, reason: str):
    body = f"""
    <p style="color:#374151;">An authorization request requires your review.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:6px 0;color:#6b7280;">Booking</td><td style="padding:6px 0;font-weight:600;color:#111827;">{booking_name}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Reason</td><td style="padding:6px 0;color:#111827;">{reason}</td></tr>
    </table>
    <p style="color:#374151;">Please log in to the system to review and authorize or decline this request.</p>
    """
    send_email(to_email, f"Authorization Request — {booking_name}", _html("Authorization Request", body, "#7c3aed"))


def email_authorization_approved(to_email: str, booking_name: str):
    body = f"""
    <p style="color:#374151;">Dear Agent,</p>
    <p style="color:#374151;">The authorization request for booking <strong>{booking_name}</strong> has been
    <strong style="color:#16a34a;">approved</strong>.</p>
    <p style="color:#374151;">Finance and admins have been notified to proceed with payment validation and permit purchase.</p>
    """
    send_email(to_email, f"Authorization Approved — {booking_name}", _html("Authorization Approved", body, "#16a34a"))


def email_authorization_declined(to_email: str, booking_name: str, notes: str):
    body = f"""
    <p style="color:#374151;">Dear Agent,</p>
    <p style="color:#374151;">The authorization request for booking <strong>{booking_name}</strong> has been
    <strong style="color:#dc2626;">declined</strong>.</p>
    <p style="color:#374151;"><strong>Reason:</strong> {notes}</p>
    <p style="color:#374151;">You may submit an appeal via the system if you believe this decision should be reconsidered.</p>
    """
    send_email(to_email, f"Authorization Declined — {booking_name}", _html("Authorization Declined", body, "#dc2626"))


def email_permits_purchased(to_email: str, booking_name: str, permit_type: str, trek_date: str):
    body = f"""
    <p style="color:#374151;">Dear Agent,</p>
    <p style="color:#374151;">Permits for your booking have been <strong>purchased</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:6px 0;color:#6b7280;">Booking</td><td style="padding:6px 0;font-weight:600;color:#111827;">{booking_name}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Permit Type</td><td style="padding:6px 0;color:#111827;">{permit_type}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Trek Date</td><td style="padding:6px 0;color:#111827;">{trek_date}</td></tr>
    </table>
    <p style="color:#374151;">Please ensure all passport data and traveller details are uploaded at least 45 days before the trek date.</p>
    """
    send_email(to_email, f"Permits Purchased — {booking_name}", _html("Permits Purchased", body, "#0891b2"))


# ---------------------------------------------------------------------------
# Legacy async aliases (used by notifications.py)
# ---------------------------------------------------------------------------

async def send_email_notification(email: str, subject: str, template_name: str, template_data: dict) -> bool:
    """Legacy shim — renders a simple text body from template_data and sends."""
    body = "<br>".join(f"<b>{k}:</b> {v}" for k, v in template_data.items())
    html = _html(subject, f"<p>{body}</p>")
    return await send_email_async(email, subject, html)


async def send_urgent_notification(email: str, subject: str, message: str) -> bool:
    html = _html(subject, f'<p style="color:#dc2626;font-weight:600;">{message}</p>', "#dc2626")
    return await send_email_async(email, f"URGENT: {subject}", html)


async def send_alert_notification(email: str, subject: str, message: str, priority: str = "medium") -> bool:
    color_map = {"low": "#6b7280", "medium": "#f59e0b", "high": "#ef4444", "urgent": "#dc2626"}
    color = color_map.get(priority, "#f59e0b")
    html = _html(subject, f"<p>{message}</p>", color)
    return await send_email_async(email, subject, html)


def email_amendment_requested(to_email: str, booking_name: str, original_date: str, new_date: str, fee_amount: float, fee_type: str):
    fee_label = "100% (next-year amendment)" if "next_year" in fee_type else "20% (same-year amendment)"
    body = f"""
    <p style="color:#374151;">An amendment request has been submitted for your review.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:6px 0;color:#6b7280;">Booking</td><td style="padding:6px 0;font-weight:600;color:#111827;">{booking_name}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">From</td><td style="padding:6px 0;color:#111827;">{original_date}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">To</td><td style="padding:6px 0;color:#111827;">{new_date}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Amendment Fee</td><td style="padding:6px 0;font-weight:600;color:#111827;">${fee_amount:,.2f} ({fee_label})</td></tr>
    </table>
    <p style="color:#374151;">The agent must pay the amendment fee before the date change is confirmed.</p>
    """
    send_email(to_email, f"Amendment Request — {booking_name}", _html("Amendment Request", body, "#f59e0b"))
