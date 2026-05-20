"""
auth.py — Enterprise Authentication & Session Management
Implements: short-lived JWTs, refresh token rotation, email verification,
hashed OTP storage, account locking, session tracking, token revocation,
password strength enforcement, and full audit logging.
"""
from fastapi import APIRouter, HTTPException, Depends, Request, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from database import (
    users_collection, sessions_collection,
    revoked_tokens_collection, audit_logs_collection
)
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import os, bcrypt, secrets, re, hashlib, random
from jose import JWTError, jwt
from bson import ObjectId
import audit as audit_log
from email_service import (
    send_verification_email, send_otp_email, send_welcome_email,
    send_login_alert, send_security_alert, send_account_locked_email,
    is_smtp_configured, smtp_status, test_smtp_connection,
    APP_URL as FRONTEND_APP_URL,
)
import asyncio

auth_router = APIRouter()
from limiter import limiter

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

JWT_SECRET              = os.getenv("JWT_SECRET", "smartinsure-fallback-secret-change-me")
JWT_ALGORITHM           = os.getenv("JWT_ALGORITHM", "HS256")
ADMIN_TOKEN_EXPIRE_H    = int(os.getenv("ADMIN_TOKEN_EXPIRE_HOURS", "48"))
WORKER_TOKEN_EXPIRE_H   = int(os.getenv("WORKER_TOKEN_EXPIRE_HOURS", "3"))
REFRESH_TOKEN_EXPIRE_D  = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
APP_URL                 = os.getenv("APP_URL", "http://localhost:4200")

MAX_FAILED_ATTEMPTS     = 5        # Lock after this many failures
LOCKOUT_MINUTES         = 15       # Lock duration
OTP_EXPIRE_MINUTES      = 15       # OTP validity
VERIFY_TOKEN_EXPIRE_H   = 24       # Email verification link validity
OTP_MAX_ATTEMPTS        = 5        # Max wrong OTP guesses

bearer_scheme = HTTPBearer(auto_error=False)

# ─────────────────────────────────────────────────────────────────────────────
# Password Helpers
# ─────────────────────────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password[:72].encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain[:72].encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def validate_password_strength(password: str) -> Optional[str]:
    """Returns error message if password is weak, None if strong enough."""
    if len(password) < 8:
        return "Password must be at least 8 characters."
    if not re.search(r"[A-Z]", password):
        return "Password must contain at least one uppercase letter."
    if not re.search(r"[0-9]", password):
        return "Password must contain at least one number."
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>_\-+=\[\]\\;'/`~]", password):
        return "Password must contain at least one special character (!@#$%^&* etc.)."
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Token Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _get_token_expire_hours(role: str) -> int:
    return ADMIN_TOKEN_EXPIRE_H if role == "admin" else WORKER_TOKEN_EXPIRE_H


def create_access_token(
    user_id: str, username: str, role: str = "worker",
    assigned_sheet: Optional[str] = None, admin_id: Optional[str] = None
) -> str:
    expire_h = _get_token_expire_hours(role)
    expire = datetime.utcnow() + timedelta(hours=expire_h)
    jti = secrets.token_hex(16)  # Unique token ID for revocation
    payload = {
        "sub":            user_id,
        "username":       username,
        "role":           role,
        "assigned_sheet": assigned_sheet,
        "admin_id":       admin_id,
        "exp":            expire,
        "iat":            datetime.utcnow(),
        "jti":            jti,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> tuple[str, str, datetime]:
    """Returns (raw_token, hashed_token, expiry_dt)"""
    raw = secrets.token_urlsafe(48)
    hashed = hashlib.sha256(raw.encode()).hexdigest()
    expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_D)
    return raw, hashed, expires_at


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        return None


async def is_token_revoked(jti: str) -> bool:
    """Check if a token's JTI has been revoked."""
    doc = await revoked_tokens_collection.find_one({"jti": jti})
    return doc is not None


async def revoke_token(jti: str, expires_at: datetime):
    """Add token JTI to the revocation list (TTL auto-cleanup)."""
    try:
        await revoked_tokens_collection.update_one(
            {"jti": jti},
            {"$set": {"jti": jti, "expires_at": expires_at}},
            upsert=True
        )
    except Exception:
        pass


def _get_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _get_device(request: Request) -> str:
    return request.headers.get("User-Agent", "Unknown device")


# ─────────────────────────────────────────────────────────────────────────────
# Dependencies
# ─────────────────────────────────────────────────────────────────────────────

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
) -> Dict[str, Any]:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated. Please log in.")
    
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token. Please log in again.")

    # Check token revocation
    jti = payload.get("jti")
    if jti and await is_token_revoked(jti):
        raise HTTPException(status_code=401, detail="Session has been revoked. Please log in again.")

    role = payload.get("role", "worker")
    user_id = payload["sub"]
    admin_id = payload.get("admin_id")

    return {
        "id":             user_id,
        "username":       payload.get("username", ""),
        "role":           role,
        "assigned_sheet": payload.get("assigned_sheet", None),
        "data_owner_id":  admin_id if (role == "worker" and admin_id) else user_id,
        "admin_id":       admin_id,
        "jti":            jti,
        "exp":            payload.get("exp"),
    }


async def require_admin(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    return current_user


# ─────────────────────────────────────────────────────────────────────────────
# Auth Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@auth_router.post("/register")
async def register(payload: Dict[str, Any], request: Request):
    """Public registration — creates admin or worker accounts."""
    username = str(payload.get("username", "")).strip().lower()
    password = str(payload.get("password", "")).strip()
    email    = str(payload.get("email", "")).strip().lower()

    # ── Validation ───────────────────────────────────────────────────────────
    if not username or len(username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters.")
    if len(username) > 30:
        raise HTTPException(status_code=400, detail="Username too long (max 30 chars).")
    if not re.match(r"^[a-z0-9_\-]+$", username):
        raise HTTPException(status_code=400, detail="Username may only contain letters, numbers, underscores, hyphens.")
    if not password:
        raise HTTPException(status_code=400, detail="Password is required.")

    pw_error = validate_password_strength(password)
    if pw_error:
        raise HTTPException(status_code=400, detail=pw_error)

    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="A valid email address is required.")

    existing_user = await users_collection.find_one({"username": username})
    if existing_user:
        raise HTTPException(status_code=409, detail=f'Username "{username}" is already taken.')

    existing_email = await users_collection.find_one({"email": email})
    if existing_email:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    # ── Role Assignment ───────────────────────────────────────────────────── 
    total_users = await users_collection.count_documents({})
    requested_role = str(payload.get("role", "")).lower().strip()
    admin_id_field = payload.get("admin_id")

    if requested_role == "admin" or total_users == 0:
        role = "admin"
        admin_id_field = None
    else:
        role = "worker"

    # ── Email Verification Token ───────────────────────────────────────────── 
    verify_token = secrets.token_urlsafe(32)
    verify_otp   = str(random.randint(100000, 999999))
    verify_otp_h = hashlib.sha256(verify_otp.encode()).hexdigest()
    verify_exp   = datetime.utcnow() + timedelta(hours=VERIFY_TOKEN_EXPIRE_H)
    verify_url   = f"{FRONTEND_APP_URL}/verify-email?token={verify_token}"

    # First admin is auto-verified (bootstrap); others require verification
    is_first_user = (total_users == 0)

    hashed_pw = hash_password(password)
    doc = {
        "username":                  username,
        "email":                     email,
        "password":                  hashed_pw,
        "role":                      role,
        "assigned_sheet":            "default",
        "created_at":                datetime.utcnow(),
        "email_verified":            is_first_user,
        "email_verification_token":  verify_token if not is_first_user else None,
        "email_verification_otp_h":  verify_otp_h if not is_first_user else None,
        "email_verify_exp":          verify_exp if not is_first_user else None,
        "failed_attempts":           0,
        "locked_until":              None,
        "last_login_at":             None,
        "last_login_ip":             None,
        "password_changed_at":       datetime.utcnow(),
    }
    if admin_id_field:
        doc["admin_id"] = admin_id_field

    result = await users_collection.insert_one(doc)
    user_id = str(result.inserted_id)

    # ── Audit Log ─────────────────────────────────────────────────────────── 
    await audit_log.log_action(
        audit_log.REGISTER, user_id=user_id, username=username,
        ip=_get_ip(request), user_agent=_get_device(request),
        detail=f"Role: {role}, email_verified: {is_first_user}"
    )

    # ── Email verification via SMTP OTP ───────────────────────────────────────
    email_verified = is_first_user
    needs_email_verify = False

    if not is_first_user:
        if is_smtp_configured():
            sent = await send_verification_email(email, username, verify_url, verify_otp)
            if not sent:
                await users_collection.delete_one({"_id": result.inserted_id})
                raise HTTPException(
                    status_code=503,
                    detail="Could not send verification email. Please try again.",
                )
            needs_email_verify = True
        else:
            await users_collection.update_one(
                {"_id": result.inserted_id},
                {
                    "$set": {"email_verified": True},
                    "$unset": {
                        "email_verification_token": "",
                        "email_verification_otp_h": "",
                        "email_verify_exp": "",
                    },
                },
            )
            email_verified = True
    else:
        asyncio.create_task(send_welcome_email(email, username, role))

    token = None
    user_resp = {
        "id": user_id, "username": username, "role": role,
        "assigned_sheet": "default", "admin_id": admin_id_field,
        "email_verified": email_verified,
    }

    if email_verified:
        token = create_access_token(user_id, username, role, "default", admin_id_field)

    return {
        "message": "Account created successfully." if email_verified
                   else "Account created! Please check your email for the 6-digit code.",
        "email_verification_required": needs_email_verify,
        "token": token,
        "user": user_resp,
    }


@auth_router.post("/login")
@limiter.limit("10/minute")
async def login(request: Request, payload: Dict[str, Any]):
    username = str(payload.get("username", "")).strip().lower()
    password = str(payload.get("password", "")).strip()
    ip       = _get_ip(request)
    device   = _get_device(request)

    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password are required.")

    # Allow login with either username or email
    if "@" in username:
        user = await users_collection.find_one({"email": username})
    else:
        user = await users_collection.find_one({"username": username})

    # ── Account locked? ──────────────────────────────────────────────────── 
    if user:
        locked_until = user.get("locked_until")
        if locked_until and datetime.utcnow() < locked_until:
            remaining = int((locked_until - datetime.utcnow()).total_seconds() / 60) + 1
            await audit_log.log_action(
                audit_log.LOGIN_FAILED, user_id=str(user["_id"]),
                username=username, ip=ip, user_agent=device,
                detail=f"Login attempt while account locked. {remaining}min remaining."
            )
            raise HTTPException(
                status_code=423,
                detail=f"Account locked due to too many failed attempts. Try again in {remaining} minute(s)."
            )

    # ── Credential check ─────────────────────────────────────────────────── 
    if not user or not verify_password(password, user.get("password", "")):
        if user:
            attempts = user.get("failed_attempts", 0) + 1
            update = {"$set": {"failed_attempts": attempts}}
            if attempts >= MAX_FAILED_ATTEMPTS:
                lock_until = datetime.utcnow() + timedelta(minutes=LOCKOUT_MINUTES)
                update["$set"]["locked_until"] = lock_until
                # Send lock alert
                if user.get("email"):
                    unlock_str = lock_until.strftime("%H:%M UTC")
                    asyncio.create_task(
                        send_account_locked_email(user["email"], username, unlock_str, ip)
                    )
                await audit_log.log_action(
                    audit_log.ACCOUNT_LOCKED, user_id=str(user["_id"]),
                    username=username, ip=ip, user_agent=device,
                    detail=f"Locked after {attempts} failed attempts."
                )
            await users_collection.update_one({"_id": user["_id"]}, update)
            await audit_log.log_action(
                audit_log.LOGIN_FAILED, user_id=str(user["_id"]),
                username=username, ip=ip, user_agent=device,
                detail=f"Attempt {attempts}/{MAX_FAILED_ATTEMPTS}"
            )
        raise HTTPException(status_code=401, detail="Invalid username or password.")

    # ── Email Verification Check ──────────────────────────────────────────── 
    if not user.get("email_verified", True):
        raise HTTPException(
            status_code=403,
            detail="Email not verified. Please check your inbox and verify your email before logging in.",
            headers={"X-Reason": "EMAIL_NOT_VERIFIED"}
        )

    # ── Successful login — reset failure count ────────────────────────────── 
    user_id        = str(user["_id"])
    role           = user.get("role", "worker")
    assigned_sheet = user.get("assigned_sheet", "default")
    admin_id       = user.get("admin_id")

    # Create refresh token
    raw_refresh, hashed_refresh, refresh_exp = create_refresh_token(user_id)

    await users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "failed_attempts":    0,
            "locked_until":       None,
            "last_login_at":      datetime.utcnow(),
            "last_login_ip":      ip,
            "last_device":        device[:300],
            "refresh_token_hash": hashed_refresh,
            "refresh_token_exp":  refresh_exp,
        }}
    )

    # Store session fingerprint
    await sessions_collection.update_one(
        {"user_id": user_id},
        {"$set": {
            "user_id":    user_id,
            "username":   username,
            "ip":         ip,
            "user_agent": device[:300],
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(hours=_get_token_expire_hours(role)),
        }},
        upsert=True
    )

    # Audit log
    await audit_log.log_action(
        audit_log.LOGIN, user_id=user_id, username=username,
        ip=ip, user_agent=device, detail=f"Role: {role}"
    )

    # Send login alert (fire-and-forget)
    if user.get("email"):
        ts = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
        asyncio.create_task(send_login_alert(user["email"], username, ip, device, ts))

    access_token = create_access_token(user_id, username, role, assigned_sheet, admin_id)

    return {
        "message":       "Login successful.",
        "token":         access_token,
        "refresh_token": raw_refresh,
        "expires_in_hours": _get_token_expire_hours(role),
        "user": {
            "id":             user_id,
            "username":       username,
            "role":           role,
            "assigned_sheet": assigned_sheet,
            "admin_id":       admin_id,
            "email_verified": user.get("email_verified", True),
            "last_login_at":  user.get("last_login_at"),
        },
    }


@auth_router.post("/logout")
async def logout(
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Server-side token revocation."""
    jti = current_user.get("jti")
    exp = current_user.get("exp")
    if jti and exp:
        expires_at = datetime.utcfromtimestamp(exp)
        await revoke_token(jti, expires_at)

    # Clear refresh token
    await users_collection.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$unset": {"refresh_token_hash": "", "refresh_token_exp": ""}}
    )
    # Remove session
    await sessions_collection.delete_one({"user_id": current_user["id"]})

    await audit_log.log_action(
        audit_log.LOGOUT, user_id=current_user["id"],
        username=current_user["username"],
        ip=_get_ip(request), user_agent=_get_device(request)
    )
    return {"message": "Logged out successfully."}


@auth_router.post("/refresh")
async def refresh_token(request: Request, payload: Dict[str, Any]):
    """Exchange a refresh token for a new access token (rotation)."""
    raw_token = str(payload.get("refresh_token", "")).strip()
    user_id   = str(payload.get("user_id", "")).strip()

    if not raw_token or not user_id:
        raise HTTPException(status_code=400, detail="refresh_token and user_id are required.")

    try:
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user_id.")

    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    stored_hash = user.get("refresh_token_hash")
    token_exp   = user.get("refresh_token_exp")

    if not stored_hash or not token_exp:
        raise HTTPException(status_code=401, detail="No active refresh token. Please log in again.")

    if datetime.utcnow() > token_exp:
        raise HTTPException(status_code=401, detail="Refresh token expired. Please log in again.")

    submitted_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    if submitted_hash != stored_hash:
        # Possible token theft — revoke everything
        await users_collection.update_one(
            {"_id": user["_id"]},
            {"$unset": {"refresh_token_hash": "", "refresh_token_exp": ""}}
        )
        await audit_log.log_action(
            audit_log.TOKEN_REVOKED, user_id=str(user["_id"]),
            username=user.get("username"), ip=_get_ip(request),
            detail="Refresh token mismatch — possible theft. All tokens revoked."
        )
        raise HTTPException(status_code=401, detail="Invalid refresh token.")

    # Rotate: issue new refresh token
    new_raw, new_hash, new_exp = create_refresh_token(str(user["_id"]))
    await users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"refresh_token_hash": new_hash, "refresh_token_exp": new_exp}}
    )

    role          = user.get("role", "worker")
    assigned_sheet = user.get("assigned_sheet", "default")
    admin_id      = user.get("admin_id")
    new_access    = create_access_token(str(user["_id"]), user["username"], role, assigned_sheet, admin_id)

    await audit_log.log_action(
        audit_log.TOKEN_REFRESHED, user_id=str(user["_id"]),
        username=user.get("username"), ip=_get_ip(request)
    )

    return {
        "token":         new_access,
        "refresh_token": new_raw,
        "expires_in_hours": _get_token_expire_hours(role),
    }


@auth_router.get("/me")
async def me(current_user: Dict[str, Any] = Depends(get_current_user)):
    user = await users_collection.find_one(
        {"_id": ObjectId(current_user["id"])},
        {"password": 0, "refresh_token_hash": 0, "reset_otp_h": 0,
         "email_verification_token": 0, "email_verification_otp_h": 0}
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    user["_id"] = str(user["_id"])
    return {"user": {**current_user, **user}}


@auth_router.get("/email-status")
async def email_status():
    """Public: whether outbound email is configured (no secrets)."""
    status = smtp_status()
    return {
        "email_enabled": status["configured"],
        "login_url": f"{FRONTEND_APP_URL}/login",
    }


@auth_router.get("/smtp-verify")
async def smtp_verify(current_user: Dict[str, Any] = Depends(require_admin)):
    """Admin: test SMTP login on Render (Gmail app password, etc.)."""
    result = test_smtp_connection()
    return {**smtp_status(), **result}


@auth_router.get("/sessions")
async def list_sessions(current_user: Dict[str, Any] = Depends(require_admin)):
    cursor = sessions_collection.find({}, {"_id": 0})
    sessions = await cursor.to_list(length=200)
    return {"sessions": sessions}


# ─────────────────────────────────────────────────────────────────────────────
# Email Verification
# ─────────────────────────────────────────────────────────────────────────────

@auth_router.get("/verify-email")
async def verify_email_link(token: str = Query(...)):
    """Verify email via link click (token in URL query param)."""
    user = await users_collection.find_one({"email_verification_token": token})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification link.")

    if user.get("email_verified"):
        return {"message": "Email already verified. You can log in."}

    if user.get("email_verify_exp") and datetime.utcnow() > user["email_verify_exp"]:
        raise HTTPException(status_code=400, detail="Verification link expired. Please request a new one.")

    await users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"email_verified": True},
         "$unset": {"email_verification_token": "", "email_verification_otp_h": "",
                    "email_verify_exp": ""}}
    )
    await audit_log.log_action(
        audit_log.EMAIL_VERIFIED, user_id=str(user["_id"]),
        username=user.get("username"), detail="Verified via email link"
    )
    # Send welcome email
    if user.get("email"):
        asyncio.create_task(send_welcome_email(user["email"], user.get("username", ""), user.get("role", "worker")))

    return {"message": "Email verified successfully! You can now log in."}


@auth_router.post("/verify-email-otp")
async def verify_email_otp(payload: Dict[str, Any]):
    """Verify email via 6-digit OTP (alternative to link click)."""
    email = str(payload.get("email", "")).strip().lower()
    otp   = str(payload.get("otp", "")).strip()

    if not email or not otp:
        raise HTTPException(status_code=400, detail="Email and OTP are required.")

    user = await users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email.")

    if user.get("email_verified"):
        return {"message": "Email already verified. You can log in."}

    if user.get("email_verify_exp") and datetime.utcnow() > user["email_verify_exp"]:
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new verification email.")

    submitted_hash = hashlib.sha256(otp.encode()).hexdigest()
    stored_hash    = user.get("email_verification_otp_h", "")

    if submitted_hash != stored_hash:
        raise HTTPException(status_code=400, detail="Invalid OTP.")

    await users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"email_verified": True},
         "$unset": {"email_verification_token": "", "email_verification_otp_h": "",
                    "email_verify_exp": ""}}
    )
    await audit_log.log_action(
        audit_log.EMAIL_VERIFIED, user_id=str(user["_id"]),
        username=user.get("username"), detail="Verified via OTP"
    )
    if user.get("email"):
        asyncio.create_task(send_welcome_email(user["email"], user.get("username", ""), user.get("role", "worker")))

    return {"message": "Email verified successfully! You can now log in."}


@auth_router.post("/resend-verification")
@limiter.limit("3/minute")
async def resend_verification(request: Request, payload: Dict[str, Any]):
    """Re-send email verification link + OTP."""
    email = str(payload.get("email", "")).strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="A valid email address is required.")

    user = await users_collection.find_one({"email": email})
    if not user:
        # Return 200 to prevent email enumeration
        return {"message": "If an account with this email exists, a verification email has been sent."}

    if user.get("email_verified"):
        return {"message": "This email is already verified. Please log in."}

    new_token   = secrets.token_urlsafe(32)
    new_otp     = str(random.randint(100000, 999999))
    new_otp_h   = hashlib.sha256(new_otp.encode()).hexdigest()
    new_exp     = datetime.utcnow() + timedelta(hours=VERIFY_TOKEN_EXPIRE_H)
    verify_url  = f"{FRONTEND_APP_URL}/verify-email?token={new_token}"

    if not is_smtp_configured():
        await users_collection.update_one(
            {"_id": user["_id"]},
            {
                "$set": {"email_verified": True},
                "$unset": {
                    "email_verification_token": "",
                    "email_verification_otp_h": "",
                    "email_verify_exp": "",
                },
            },
        )
        return {"message": "Your email is verified. You can sign in now.", "email_verified": True}

    await users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "email_verification_token": new_token,
            "email_verification_otp_h": new_otp_h,
            "email_verify_exp": new_exp,
        }}
    )
    sent = await send_verification_email(email, user.get("username", ""), verify_url, new_otp)
    if not sent:
        raise HTTPException(
            status_code=503,
            detail="Could not send verification email. Please try again.",
        )

    await audit_log.log_action(
        audit_log.EMAIL_RESENT, user_id=str(user["_id"]),
        username=user.get("username"), ip=_get_ip(request)
    )
    return {"message": "Verification email sent. Please check your inbox (and spam folder)."}


# ─────────────────────────────────────────────────────────────────────────────
# Password Reset (OTP Flow)
# ─────────────────────────────────────────────────────────────────────────────

@auth_router.post("/forgot-password")
@limiter.limit("3/minute")
async def forgot_password(request: Request, payload: Dict[str, Any]):
    try:
        email = str(payload.get("email", "")).strip().lower()
        if not email or "@" not in email:
            raise HTTPException(status_code=400, detail="A valid email address is required.")

        user = await users_collection.find_one({"$or": [{"email": email}, {"username": email}]})

        if not user:
            return {"message": "If an account with this email exists, a reset code has been sent."}

        if not is_smtp_configured():
            raise HTTPException(
                status_code=503,
                detail="Email service is not available. Please contact support.",
            )

        ip  = _get_ip(request)
        otp = str(random.randint(100000, 999999))
        otp_hash = hashlib.sha256(otp.encode()).hexdigest()
        expire_time = datetime.utcnow() + timedelta(minutes=OTP_EXPIRE_MINUTES)
        to_addr = user.get("email") or email

        await users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {
                "reset_otp_h":        otp_hash,
                "reset_otp_exp":      expire_time,
                "reset_otp_attempts": 0,
            }}
        )

        username_str = user.get("username", email)
        email_sent = await send_otp_email(to_addr, username_str, otp, ip)

        await audit_log.log_action(
            audit_log.OTP_REQUESTED, user_id=str(user["_id"]),
            username=username_str, ip=ip, user_agent=_get_device(request),
            detail="Reset OTP emailed" if email_sent else "Reset OTP email failed",
        )

        if not email_sent:
            raise HTTPException(
                status_code=503,
                detail="Could not send email. Please try again in a few minutes.",
            )

        return {"message": "If an account with this email exists, a reset code has been sent."}
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[forgot-password] Error: {exc}")
        raise HTTPException(status_code=500, detail="Something went wrong. Please try again.")


@auth_router.post("/reset-password")
async def reset_password(request: Request, payload: Dict[str, Any]):
    email        = str(payload.get("email", "")).strip().lower()
    otp          = str(payload.get("otp", "")).strip()
    new_password = str(payload.get("new_password", "")).strip()

    if not email or not otp or not new_password:
        raise HTTPException(status_code=400, detail="Email, OTP, and new password are required.")

    pw_error = validate_password_strength(new_password)
    if pw_error:
        raise HTTPException(status_code=400, detail=pw_error)

    user = await users_collection.find_one({"$or": [{"email": email}, {"username": email}]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    # Check OTP attempt limit
    attempts = user.get("reset_otp_attempts", 0)
    if attempts >= OTP_MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many OTP attempts. Please request a new code.")

    stored_hash = user.get("reset_otp_h")
    stored_exp  = user.get("reset_otp_exp")

    if not stored_hash:
        raise HTTPException(status_code=400, detail="No pending reset. Please request a new OTP.")

    submitted_hash = hashlib.sha256(otp.encode()).hexdigest()
    if submitted_hash != stored_hash:
        await users_collection.update_one(
            {"_id": user["_id"]}, {"$inc": {"reset_otp_attempts": 1}}
        )
        await audit_log.log_action(
            audit_log.OTP_FAILED, user_id=str(user["_id"]),
            username=user.get("username"), ip=_get_ip(request),
            detail=f"Attempt {attempts + 1}/{OTP_MAX_ATTEMPTS}"
        )
        raise HTTPException(status_code=400, detail="Invalid OTP.")

    if not stored_exp or datetime.utcnow() > stored_exp:
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")

    hashed = hash_password(new_password)
    await users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "password":            hashed,
            "password_changed_at": datetime.utcnow(),
            # Invalidate any existing refresh tokens
            "refresh_token_hash":  None,
            "refresh_token_exp":   None,
        },
         "$unset": {"reset_otp_h": "", "reset_otp_exp": "", "reset_otp_attempts": ""}}
    )

    await audit_log.log_action(
        audit_log.PASSWORD_RESET, user_id=str(user["_id"]),
        username=user.get("username"), ip=_get_ip(request), user_agent=_get_device(request)
    )

    # Security alert email
    if user.get("email"):
        asyncio.create_task(send_security_alert(
            user["email"], user.get("username", ""), "Password Changed",
            f"Your password was reset from IP: {_get_ip(request)}"
        ))

    return {"message": "Password reset successfully. You can now log in with your new password."}


# ─────────────────────────────────────────────────────────────────────────────
# Audit Logs Endpoint (Admin only)
# ─────────────────────────────────────────────────────────────────────────────

@auth_router.get("/audit-logs")
async def get_audit_logs(
    limit: int = 100,
    skip:  int = 0,
    current_user: Dict[str, Any] = Depends(require_admin)
):
    cursor = audit_logs_collection.find(
        {}, {"_id": 0}
    ).sort("timestamp", -1).skip(skip).limit(min(limit, 500))
    logs = await cursor.to_list(length=min(limit, 500))
    # Serialize datetimes
    for log in logs:
        if "timestamp" in log and isinstance(log["timestamp"], datetime):
            log["timestamp"] = log["timestamp"].isoformat()
    return {"audit_logs": logs, "total": len(logs)}
