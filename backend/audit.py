"""
audit.py — Enterprise Audit Logging System
Writes structured, immutable audit records for all security-relevant actions.
"""
from datetime import datetime
from typing import Optional
from database import audit_logs_collection


# ── Action Constants ──────────────────────────────────────────────────────────
LOGIN              = "LOGIN"
LOGOUT             = "LOGOUT"
LOGIN_FAILED       = "LOGIN_FAILED"
REGISTER           = "REGISTER"
PASSWORD_RESET     = "PASSWORD_RESET"
PASSWORD_CHANGED   = "PASSWORD_CHANGED"
EMAIL_VERIFIED     = "EMAIL_VERIFIED"
EMAIL_RESENT       = "EMAIL_RESENT"
ACCOUNT_LOCKED     = "ACCOUNT_LOCKED"
ACCOUNT_UNLOCKED   = "ACCOUNT_UNLOCKED"
TOKEN_REFRESHED    = "TOKEN_REFRESHED"
TOKEN_REVOKED      = "TOKEN_REVOKED"
EXPORT             = "EXPORT"
UPLOAD             = "UPLOAD"
ROLE_CHANGE        = "ROLE_CHANGE"
WORKER_CREATED     = "WORKER_CREATED"
WORKER_DELETED     = "WORKER_DELETED"
OTP_REQUESTED      = "OTP_REQUESTED"
OTP_FAILED         = "OTP_FAILED"


async def log_action(
    action: str,
    user_id: Optional[str] = None,
    username: Optional[str] = None,
    ip: Optional[str] = None,
    user_agent: Optional[str] = None,
    detail: Optional[str] = None,
    extra: Optional[dict] = None
):
    """
    Write a structured audit log entry to MongoDB.
    Non-blocking — failures are swallowed so they never break the main request.
    """
    try:
        doc = {
            "action":     action,
            "user_id":    user_id,
            "username":   username,
            "ip":         ip,
            "user_agent": (user_agent or "")[:300],
            "detail":     detail,
            "timestamp":  datetime.utcnow(),
        }
        if extra:
            doc["extra"] = extra
        await audit_logs_collection.insert_one(doc)
    except Exception as e:
        print(f"[audit] Failed to write log: {e}")
