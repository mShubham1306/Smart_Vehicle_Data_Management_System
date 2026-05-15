"""
email_service.py — Enterprise HTML Email Service
Sends professional branded emails for verification, OTP, alerts, and welcome messages.
Uses SMTP with async Celery task dispatch and 3-attempt retry logic.
"""
import os
import smtplib
import traceback
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime

SMTP_SERVER  = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT    = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER    = os.getenv("SMTP_USER", "")
SMTP_PASS    = os.getenv("SMTP_PASS", "")
APP_NAME     = os.getenv("APP_NAME", "SmartInsure")
APP_URL      = os.getenv("APP_URL", "http://localhost:4200")
FROM_NAME    = os.getenv("FROM_NAME", "SmartInsure Security")


# ─────────────────────────────────────────────────────────────────────────────
# Base HTML template wrapper
# ─────────────────────────────────────────────────────────────────────────────

def _base_template(title: str, content: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">

          <!-- Logo Header -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#ef4444,#b91c1c);border-radius:14px;padding:14px 18px;text-align:center;">
                    <span style="color:#ffffff;font-weight:900;font-size:1.2rem;letter-spacing:-0.5px;">SI</span>
                  </td>
                  <td style="padding-left:14px;vertical-align:middle;">
                    <div style="color:#f0f0f0;font-weight:900;font-size:1.3rem;letter-spacing:-0.5px;">{APP_NAME}</div>
                    <div style="color:#555;font-size:0.68rem;margin-top:2px;">Vehicle Data Management Platform</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#111111;border:1px solid #222222;border-radius:20px;padding:36px 40px;">
              {content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="color:#333;font-size:0.65rem;margin:0;">This email was sent by {APP_NAME}. Do not reply to this email.</p>
              <p style="color:#333;font-size:0.65rem;margin:4px 0 0;">© {datetime.utcnow().year} {APP_NAME}. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


# ─────────────────────────────────────────────────────────────────────────────
# Email Templates
# ─────────────────────────────────────────────────────────────────────────────

def _template_verification(username: str, verify_url: str, otp: str, expires_min: int = 60) -> str:
    content = f"""
      <h2 style="color:#f0f0f0;font-size:1.4rem;font-weight:800;margin:0 0 8px;">Verify Your Email Address</h2>
      <p style="color:#888;font-size:0.85rem;margin:0 0 28px;line-height:1.6;">
        Hi <strong style="color:#f0f0f0;">{username}</strong>, welcome to {APP_NAME}!
        Please verify your email address to activate your account.
      </p>

      <!-- CTA Button -->
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:28px;">
        <tr>
          <td align="center">
            <a href="{verify_url}" style="display:inline-block;background:linear-gradient(135deg,#ef4444,#b91c1c);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:12px;font-weight:800;font-size:0.9rem;letter-spacing:0.3px;">
              ✓ Verify Email Address
            </a>
          </td>
        </tr>
      </table>

      <!-- Divider -->
      <div style="border-top:1px solid #222;margin:24px 0;"></div>

      <!-- OTP fallback -->
      <p style="color:#888;font-size:0.78rem;margin:0 0 12px;">Or enter this verification code manually:</p>
      <div style="background:#0c0c0c;border:1px solid #2a2a2a;border-radius:12px;padding:20px;text-align:center;margin-bottom:16px;">
        <span style="color:#ef4444;font-size:2rem;font-weight:900;letter-spacing:8px;font-family:monospace;">{otp}</span>
      </div>
      <p style="color:#555;font-size:0.72rem;margin:0;">This code expires in <strong style="color:#f59e0b;">{expires_min} minutes</strong>. Do not share it with anyone.</p>
      <p style="color:#555;font-size:0.72rem;margin:8px 0 0;">If you did not create an account, you can safely ignore this email.</p>
    """
    return _base_template(f"Verify Your Email — {APP_NAME}", content)


def _template_otp_reset(username: str, otp: str, ip: str = "Unknown") -> str:
    content = f"""
      <h2 style="color:#f0f0f0;font-size:1.4rem;font-weight:800;margin:0 0 8px;">Password Reset OTP</h2>
      <p style="color:#888;font-size:0.85rem;margin:0 0 28px;line-height:1.6;">
        Hi <strong style="color:#f0f0f0;">{username}</strong>, we received a request to reset your password.
        Use the code below to proceed.
      </p>

      <!-- OTP Box -->
      <div style="background:#0c0c0c;border:2px solid rgba(239,68,68,0.3);border-radius:16px;padding:28px;text-align:center;margin-bottom:24px;">
        <p style="color:#555;font-size:0.68rem;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 10px;">Your Reset Code</p>
        <span style="color:#ef4444;font-size:2.5rem;font-weight:900;letter-spacing:10px;font-family:monospace;">{otp}</span>
        <p style="color:#f59e0b;font-size:0.72rem;margin:12px 0 0;">⏱ Expires in 15 minutes</p>
      </div>

      <!-- Security Warning -->
      <div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:16px;margin-bottom:16px;">
        <p style="color:#ef4444;font-size:0.78rem;font-weight:700;margin:0 0 4px;">⚠ Security Notice</p>
        <p style="color:#888;font-size:0.75rem;margin:0;">
          This request came from IP: <strong style="color:#f0f0f0;">{ip}</strong><br>
          If you didn't request this, your account may be at risk. Please change your password immediately.
        </p>
      </div>
      <p style="color:#555;font-size:0.72rem;margin:0;">Do not share this code with anyone — {APP_NAME} will never ask for it.</p>
    """
    return _base_template(f"Password Reset — {APP_NAME}", content)


def _template_welcome(username: str, role: str) -> str:
    role_label = "Administrator" if role == "admin" else "Worker"
    content = f"""
      <h2 style="color:#f0f0f0;font-size:1.4rem;font-weight:800;margin:0 0 8px;">Welcome to {APP_NAME}! 🎉</h2>
      <p style="color:#888;font-size:0.85rem;margin:0 0 24px;line-height:1.6;">
        Your account has been created and verified successfully.
        You're now set up as a <strong style="color:#ef4444;">{role_label}</strong>.
      </p>

      <div style="background:#0c0c0c;border:1px solid #222;border-radius:12px;padding:20px;margin-bottom:24px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="color:#555;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.8px;padding-bottom:4px;">Username</td>
            <td style="color:#f0f0f0;font-size:0.85rem;font-weight:700;text-align:right;">{username}</td>
          </tr>
          <tr>
            <td style="color:#555;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.8px;padding-top:8px;">Role</td>
            <td style="color:#ef4444;font-size:0.85rem;font-weight:700;text-align:right;padding-top:8px;">{role_label}</td>
          </tr>
        </table>
      </div>

      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td align="center">
            <a href="{APP_URL}/login" style="display:inline-block;background:linear-gradient(135deg,#ef4444,#b91c1c);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:12px;font-weight:800;font-size:0.9rem;">
              → Sign In Now
            </a>
          </td>
        </tr>
      </table>
    """
    return _base_template(f"Welcome to {APP_NAME}", content)


def _template_login_alert(username: str, ip: str, device: str, timestamp: str) -> str:
    content = f"""
      <h2 style="color:#f0f0f0;font-size:1.4rem;font-weight:800;margin:0 0 8px;">New Login Detected</h2>
      <p style="color:#888;font-size:0.85rem;margin:0 0 24px;line-height:1.6;">
        Hi <strong style="color:#f0f0f0;">{username}</strong>,
        we detected a new sign-in to your account.
      </p>

      <div style="background:#0c0c0c;border:1px solid #222;border-radius:12px;padding:20px;margin-bottom:24px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="color:#555;font-size:0.72rem;padding-bottom:10px;">🕐 Time</td>
            <td style="color:#f0f0f0;font-size:0.82rem;text-align:right;padding-bottom:10px;">{timestamp}</td>
          </tr>
          <tr>
            <td style="color:#555;font-size:0.72rem;padding-bottom:10px;">🌐 IP Address</td>
            <td style="color:#f0f0f0;font-size:0.82rem;text-align:right;padding-bottom:10px;">{ip}</td>
          </tr>
          <tr>
            <td style="color:#555;font-size:0.72rem;">💻 Device</td>
            <td style="color:#f0f0f0;font-size:0.82rem;text-align:right;">{device[:80]}</td>
          </tr>
        </table>
      </div>

      <div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:14px;">
        <p style="color:#ef4444;font-size:0.78rem;font-weight:700;margin:0 0 4px;">Not you?</p>
        <p style="color:#888;font-size:0.75rem;margin:0;">If this wasn't you, reset your password immediately and contact your administrator.</p>
      </div>
    """
    return _base_template(f"New Login — {APP_NAME}", content)


def _template_security_alert(username: str, event: str, detail: str) -> str:
    content = f"""
      <h2 style="color:#ef4444;font-size:1.4rem;font-weight:800;margin:0 0 8px;">⚠ Security Alert</h2>
      <p style="color:#888;font-size:0.85rem;margin:0 0 24px;line-height:1.6;">
        Hi <strong style="color:#f0f0f0;">{username}</strong>,
        a security event occurred on your account.
      </p>

      <div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.3);border-radius:14px;padding:24px;margin-bottom:24px;text-align:center;">
        <p style="color:#555;font-size:0.65rem;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 8px;">Event</p>
        <p style="color:#ef4444;font-size:1.1rem;font-weight:800;margin:0 0 12px;">{event}</p>
        <p style="color:#888;font-size:0.82rem;margin:0;">{detail}</p>
      </div>

      <p style="color:#555;font-size:0.72rem;margin:0;">
        If you did not initiate this action, please contact your administrator or reset your password immediately.
      </p>
    """
    return _base_template(f"Security Alert — {APP_NAME}", content)


def _template_account_locked(username: str, unlock_at: str, ip: str) -> str:
    content = f"""
      <h2 style="color:#f59e0b;font-size:1.4rem;font-weight:800;margin:0 0 8px;">🔒 Account Temporarily Locked</h2>
      <p style="color:#888;font-size:0.85rem;margin:0 0 24px;line-height:1.6;">
        Hi <strong style="color:#f0f0f0;">{username}</strong>,
        your account has been temporarily locked due to multiple failed login attempts.
      </p>

      <div style="background:#0c0c0c;border:1px solid rgba(245,158,11,0.3);border-radius:12px;padding:20px;margin-bottom:24px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="color:#555;font-size:0.72rem;padding-bottom:10px;">🔓 Unlocks At</td>
            <td style="color:#f59e0b;font-size:0.82rem;font-weight:700;text-align:right;padding-bottom:10px;">{unlock_at}</td>
          </tr>
          <tr>
            <td style="color:#555;font-size:0.72rem;">🌐 Last Attempt IP</td>
            <td style="color:#f0f0f0;font-size:0.82rem;text-align:right;">{ip}</td>
          </tr>
        </table>
      </div>

      <p style="color:#555;font-size:0.72rem;margin:0;">
        If this wasn't you, your account credentials may be compromised.
        Please reset your password as soon as the lockout expires.
      </p>
    """
    return _base_template(f"Account Locked — {APP_NAME}", content)


# ─────────────────────────────────────────────────────────────────────────────
# Core send function (sync, used by Celery task)
# ─────────────────────────────────────────────────────────────────────────────

def _send_email_sync(to_email: str, subject: str, html_body: str, max_retries: int = 3) -> bool:
    if not SMTP_USER or not SMTP_PASS:
        print(f"[email] SMTP not configured — would have sent to {to_email}: {subject}")
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{FROM_NAME} <{SMTP_USER}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html"))

    for attempt in range(1, max_retries + 1):
        try:
            server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=15)
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
            server.quit()
            print(f"[email] Sent to {to_email}: {subject}")
            return True
        except Exception as e:
            print(f"[email] Attempt {attempt}/{max_retries} failed for {to_email}: {e}")
            if attempt == max_retries:
                traceback.print_exc()
    return False


# ─────────────────────────────────────────────────────────────────────────────
# Public async wrappers (can be run directly or via Celery)
# ─────────────────────────────────────────────────────────────────────────────

async def send_verification_email(to_email: str, username: str, verify_url: str, otp: str) -> bool:
    html = _template_verification(username, verify_url, otp)
    return _send_email_sync(to_email, f"Verify Your Email — {APP_NAME}", html)


async def send_otp_email(to_email: str, username: str, otp: str, ip: str = "Unknown") -> bool:
    html = _template_otp_reset(username, otp, ip)
    return _send_email_sync(to_email, f"Password Reset Code — {APP_NAME}", html)


async def send_welcome_email(to_email: str, username: str, role: str) -> bool:
    html = _template_welcome(username, role)
    return _send_email_sync(to_email, f"Welcome to {APP_NAME}!", html)


async def send_login_alert(to_email: str, username: str, ip: str, device: str, timestamp: str) -> bool:
    html = _template_login_alert(username, ip, device, timestamp)
    return _send_email_sync(to_email, f"New Login to Your Account — {APP_NAME}", html)


async def send_security_alert(to_email: str, username: str, event: str, detail: str) -> bool:
    html = _template_security_alert(username, event, detail)
    return _send_email_sync(to_email, f"Security Alert — {APP_NAME}", html)


async def send_account_locked_email(to_email: str, username: str, unlock_at: str, ip: str) -> bool:
    html = _template_account_locked(username, unlock_at, ip)
    return _send_email_sync(to_email, f"Account Locked — {APP_NAME}", html)
