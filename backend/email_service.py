"""
email_service.py — HTML email via SMTP (Gmail / SendGrid / etc.)
Configure on Render: SMTP_USER, SMTP_PASS, APP_URL=https://insuradrive.vercel.app
"""
import os
import smtplib
import ssl
import traceback
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime
from typing import Optional, Dict, Any

SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com").strip()
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "").strip()
SMTP_PASS = os.getenv("SMTP_PASS", "").replace(" ", "")  # Gmail app passwords often copied with spaces
SMTP_USE_SSL = os.getenv("SMTP_USE_SSL", "").lower() in ("1", "true", "yes")
APP_NAME = os.getenv("APP_NAME", "SmartInsure")
APP_URL = os.getenv("APP_URL", "https://insuradrive.vercel.app").rstrip("/")
FROM_NAME = os.getenv("FROM_NAME", "SmartInsure Security")
VERIFY_OTP_EXPIRE_MIN = int(os.getenv("VERIFY_OTP_EXPIRE_MIN", "60"))


def is_smtp_configured() -> bool:
    return bool(SMTP_USER and SMTP_PASS)


def smtp_status() -> Dict[str, Any]:
    """Safe status for health checks (no secrets)."""
    return {
        "configured": is_smtp_configured(),
        "server": SMTP_SERVER,
        "port": SMTP_PORT,
        "use_ssl": SMTP_USE_SSL or SMTP_PORT == 465,
        "from_user": SMTP_USER[:3] + "***" if SMTP_USER else None,
        "app_url": APP_URL,
    }


def _base_template(title: str, content: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>{title}</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Segoe UI,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" style="max-width:560px;">
        <tr><td align="center" style="padding-bottom:28px;">
          <span style="display:inline-block;background:#ef4444;color:#fff;font-weight:900;padding:14px 18px;border-radius:14px;">SI</span>
          <div style="color:#f0f0f0;font-weight:900;font-size:1.3rem;margin-top:10px;">{APP_NAME}</div>
        </td></tr>
        <tr><td style="background:#111;border:1px solid #222;border-radius:20px;padding:36px 40px;">{content}</td></tr>
        <tr><td align="center" style="padding-top:24px;">
          <p style="color:#333;font-size:0.65rem;">© {datetime.utcnow().year} {APP_NAME}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""


def _template_verification(username: str, verify_url: str, otp: str) -> tuple[str, str]:
    plain = (
        f"Hi {username},\n\n"
        f"Your {APP_NAME} verification code is: {otp}\n\n"
        f"Or open this link: {verify_url}\n\n"
        f"Code expires in {VERIFY_OTP_EXPIRE_MIN} minutes.\n"
    )
    html = _base_template(
        f"Verify Your Email — {APP_NAME}",
        f"""
      <h2 style="color:#f0f0f0;">Verify Your Email</h2>
      <p style="color:#888;">Hi <strong style="color:#fff;">{username}</strong>, welcome to {APP_NAME}!</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="{verify_url}" style="background:#ef4444;color:#fff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:800;">Verify Email</a>
      </p>
      <p style="color:#888;font-size:0.78rem;">Or enter this code in the app:</p>
      <p style="text-align:center;color:#ef4444;font-size:2rem;font-weight:900;letter-spacing:8px;font-family:monospace;">{otp}</p>
      <p style="color:#555;font-size:0.72rem;">Expires in {VERIFY_OTP_EXPIRE_MIN} minutes.</p>
    """,
    )
    return html, plain


def _template_otp_reset(username: str, otp: str, ip: str = "Unknown") -> tuple[str, str]:
    plain = (
        f"Hi {username},\n\n"
        f"Your password reset code for {APP_NAME} is: {otp}\n\n"
        f"Expires in 15 minutes.\n"
        f"If you did not request this, ignore this email.\n"
    )
    html = _base_template(
        f"Password Reset — {APP_NAME}",
        f"""
      <h2 style="color:#f0f0f0;">Password Reset</h2>
      <p style="color:#888;">Hi <strong style="color:#fff;">{username}</strong>, use this code to reset your password:</p>
      <p style="text-align:center;color:#ef4444;font-size:2.5rem;font-weight:900;letter-spacing:10px;font-family:monospace;">{otp}</p>
      <p style="color:#f59e0b;font-size:0.72rem;">Expires in 15 minutes</p>
      <p style="color:#555;font-size:0.72rem;">Request from IP: {ip}</p>
    """,
    )
    return html, plain


def _template_welcome(username: str, role: str) -> tuple[str, str]:
    role_label = "Administrator" if role == "admin" else "Partner"
    plain = f"Welcome to {APP_NAME}, {username}! Your role: {role_label}. Sign in: {APP_URL}/login\n"
    html = _base_template(
        f"Welcome — {APP_NAME}",
        f"""
      <h2 style="color:#f0f0f0;">Welcome! 🎉</h2>
      <p style="color:#888;">Account verified. Role: <strong style="color:#ef4444;">{role_label}</strong></p>
      <p style="text-align:center;"><a href="{APP_URL}/login" style="background:#ef4444;color:#fff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:800;">Sign In</a></p>
    """,
    )
    return html, plain


def _template_login_alert(username: str, ip: str, device: str, timestamp: str) -> tuple[str, str]:
    plain = f"New login to {APP_NAME} for {username} at {timestamp} from {ip}\n"
    html = _base_template("New Login", f"<p style='color:#888;'>New sign-in for {username} at {timestamp}</p>")
    return html, plain


def _template_security_alert(username: str, event: str, detail: str) -> tuple[str, str]:
    html = _base_template("Security Alert", f"<p style='color:#ef4444;'>{event}</p><p style='color:#888;'>{detail}</p>")
    return html, f"Security alert for {username}: {event}\n"


def _template_account_locked(username: str, unlock_at: str, ip: str) -> tuple[str, str]:
    html = _base_template("Account Locked", f"<p style='color:#888;'>Account locked until {unlock_at}</p>")
    return html, f"Account locked until {unlock_at}\n"


def _send_email_sync(to_email: str, subject: str, html_body: str, plain_body: str = "", max_retries: int = 3) -> bool:
    if not is_smtp_configured():
        print(f"[email] SMTP not configured — would send to {to_email}: {subject}")
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{FROM_NAME} <{SMTP_USER}>"
    msg["To"] = to_email
    if plain_body:
        msg.attach(MIMEText(plain_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    use_ssl = SMTP_USE_SSL or SMTP_PORT == 465

    for attempt in range(1, max_retries + 1):
        try:
            if use_ssl:
                context = ssl.create_default_context()
                with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT, timeout=30, context=context) as server:
                    server.login(SMTP_USER, SMTP_PASS)
                    server.send_message(msg)
            else:
                with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=30) as server:
                    server.ehlo()
                    server.starttls(context=ssl.create_default_context())
                    server.ehlo()
                    server.login(SMTP_USER, SMTP_PASS)
                    server.send_message(msg)
            print(f"[email] OK → {to_email}: {subject}")
            return True
        except Exception as e:
            print(f"[email] Attempt {attempt}/{max_retries} failed → {to_email}: {e}")
            if attempt == max_retries:
                traceback.print_exc()
    return False


def test_smtp_connection() -> Dict[str, Any]:
    """Used by admin health endpoint to verify Render SMTP credentials."""
    if not is_smtp_configured():
        return {"ok": False, "error": "SMTP_USER and SMTP_PASS are not set"}
    try:
        use_ssl = SMTP_USE_SSL or SMTP_PORT == 465
        if use_ssl:
            with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT, timeout=30, context=ssl.create_default_context()) as s:
                s.login(SMTP_USER, SMTP_PASS)
        else:
            with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=30) as s:
                s.ehlo()
                s.starttls(context=ssl.create_default_context())
                s.ehlo()
                s.login(SMTP_USER, SMTP_PASS)
        return {"ok": True, "message": "SMTP login successful"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def send_verification_email(to_email: str, username: str, verify_url: str, otp: str) -> bool:
    html, plain = _template_verification(username, verify_url, otp)
    return _send_email_sync(to_email, f"Verify Your Email — {APP_NAME}", html, plain)


async def send_otp_email(to_email: str, username: str, otp: str, ip: str = "Unknown") -> bool:
    html, plain = _template_otp_reset(username, otp, ip)
    return _send_email_sync(to_email, f"Password Reset Code — {APP_NAME}", html, plain)


async def send_welcome_email(to_email: str, username: str, role: str) -> bool:
    html, plain = _template_welcome(username, role)
    return _send_email_sync(to_email, f"Welcome to {APP_NAME}!", html, plain)


async def send_login_alert(to_email: str, username: str, ip: str, device: str, timestamp: str) -> bool:
    html, plain = _template_login_alert(username, ip, device, timestamp)
    return _send_email_sync(to_email, f"New Login — {APP_NAME}", html, plain)


async def send_security_alert(to_email: str, username: str, event: str, detail: str) -> bool:
    html, plain = _template_security_alert(username, event, detail)
    return _send_email_sync(to_email, f"Security Alert — {APP_NAME}", html, plain)


async def send_account_locked_email(to_email: str, username: str, unlock_at: str, ip: str) -> bool:
    html, plain = _template_account_locked(username, unlock_at, ip)
    return _send_email_sync(to_email, f"Account Locked — {APP_NAME}", html, plain)
