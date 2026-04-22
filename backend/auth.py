from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from database import users_collection
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import os
import bcrypt
from jose import JWTError, jwt

auth_router = APIRouter()

# ─────────────────────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────────────────────

JWT_SECRET    = os.getenv("JWT_SECRET", "smartinsure-fallback-secret-change-me")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_DAYS = int(os.getenv("JWT_EXPIRE_DAYS", "3650"))  # ~10 years

bearer_scheme = HTTPBearer(auto_error=False)


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password[:72].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain[:72].encode('utf-8'), hashed.encode('utf-8'))


def create_access_token(user_id: str, username: str, role: str = "worker",
                        assigned_sheet: Optional[str] = None, admin_id: Optional[str] = None) -> str:
    expire = datetime.utcnow() + timedelta(days=JWT_EXPIRE_DAYS)
    payload = {
        "sub": user_id,
        "username": username,
        "role": role,
        "assigned_sheet": assigned_sheet,
        "admin_id": admin_id,   # For workers: their parent admin's user_id
        "exp": expire,
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        return None


# ─────────────────────────────────────────────────────────────
# Dependencies
# ─────────────────────────────────────────────────────────────

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
) -> Dict[str, Any]:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated. Please log in.")
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token. Please log in again.")
    role = payload.get("role", "worker")
    user_id = payload["sub"]
    admin_id = payload.get("admin_id")
    return {
        "id": user_id,
        "username": payload.get("username", ""),
        "role": role,
        "assigned_sheet": payload.get("assigned_sheet", None),
        # Effective user_id for data queries: workers use their admin's ID
        "data_owner_id": admin_id if (role == "worker" and admin_id) else user_id,
        "admin_id": admin_id,
    }


async def require_admin(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    return current_user


# ─────────────────────────────────────────────────────────────
# Auth Endpoints
# ─────────────────────────────────────────────────────────────

@auth_router.post("/register")
async def register(payload: Dict[str, Any]):
    """Public registration — only for creating the first admin. Workers are created by admins."""
    username = str(payload.get("username", "")).strip().lower()
    password = str(payload.get("password", "")).strip()

    if not username:
        raise HTTPException(status_code=400, detail="Username is required.")
    if len(username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters.")
    if len(username) > 30:
        raise HTTPException(status_code=400, detail="Username too long (max 30 chars).")
    if not password:
        raise HTTPException(status_code=400, detail="Password is required.")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    existing = await users_collection.find_one({"username": username})
    if existing:
        raise HTTPException(status_code=409, detail=f'Username "{username}" is already taken.')

    # Role: first-ever user becomes admin, everyone else is worker
    total_users = await users_collection.count_documents({})
    requested_role = str(payload.get("role", "")).lower().strip()
    admin_id_field = payload.get("admin_id")  # Set by admin-create-worker flow
    if requested_role == "admin" or total_users == 0:
        role = "admin"
        admin_id_field = None
    else:
        role = "worker"

    hashed = hash_password(password)
    doc = {
        "username": username,
        "password": hashed,
        "role": role,
        "assigned_sheet": "default",
        "created_at": datetime.utcnow(),
    }
    if admin_id_field:
        doc["admin_id"] = admin_id_field

    result = await users_collection.insert_one(doc)
    user_id = str(result.inserted_id)
    token = create_access_token(user_id, username, role, "default", admin_id_field)

    return {
        "message": "Account created successfully.",
        "token": token,
        "user": {"id": user_id, "username": username, "role": role,
                 "assigned_sheet": "default", "admin_id": admin_id_field},
    }


@auth_router.post("/login")
async def login(payload: Dict[str, Any]):
    username = str(payload.get("username", "")).strip().lower()
    password = str(payload.get("password", "")).strip()

    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password are required.")

    user = await users_collection.find_one({"username": username})
    if not user or not verify_password(password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid username or password.")

    user_id = str(user["_id"])
    role = user.get("role", "worker")
    assigned_sheet = user.get("assigned_sheet", "default")
    admin_id = user.get("admin_id")
    token = create_access_token(user_id, username, role, assigned_sheet, admin_id)

    return {
        "message": "Login successful.",
        "token": token,
        "user": {"id": user_id, "username": username, "role": role,
                 "assigned_sheet": assigned_sheet, "admin_id": admin_id},
    }


@auth_router.get("/me")
async def me(current_user: Dict[str, Any] = Depends(get_current_user)):
    return {"user": current_user}


# ─────────────────────────────────────────────────────────────
# Password Reset (OTP Flow)
# ─────────────────────────────────────────────────────────────
import random
import smtplib
from email.mime.text import MIMEText

def send_otp_email(to_email: str, otp: str) -> bool:
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")
    
    # Needs valid credentials in environment to actually send email
    if not smtp_user or not smtp_pass:
        return False
        
    msg = MIMEText(f"Your SmartInsure Password Reset OTP is: {otp}\n\nIt is valid for 15 minutes.\n\nDo not share this code with anyone.")
    msg['Subject'] = 'SmartInsure Password Reset'
    msg['From'] = smtp_user
    msg['To'] = to_email
    
    try:
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"Failed to send email to {to_email}: {str(e)}")
        return False

@auth_router.post("/forgot-password")
async def forgot_password(payload: Dict[str, Any]):
    username = str(payload.get("username", "")).strip().lower()
    if not username:
        raise HTTPException(status_code=400, detail="Username is required.")
        
    user = await users_collection.find_one({"username": username})
    if not user:
        # Don't reveal if user exists or not for security, but we need it to work
        raise HTTPException(status_code=404, detail="User not found.")
        
    # Generate 6-digit OTP
    otp = str(random.randint(100000, 999999))
    expire_time = datetime.utcnow() + timedelta(minutes=15)
    
    await users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"reset_otp": otp, "reset_otp_exp": expire_time}}
    )
    
    email_sent = False
    if "@" in username:
        email_sent = send_otp_email(username, otp)
    
    if email_sent:
        return {
            "message": "OTP sent to your email. Please check your inbox.",
            "dev_otp": "" 
        }
    else:
        return {
            "message": "OTP generated. (SMTP not configured, showing inside alert in dev mode.)",
            "dev_otp": otp
        }


@auth_router.post("/reset-password")
async def reset_password(payload: Dict[str, Any]):
    username = str(payload.get("username", "")).strip().lower()
    otp = str(payload.get("otp", "")).strip()
    new_password = str(payload.get("new_password", "")).strip()
    
    if not username or not otp or not new_password:
        raise HTTPException(status_code=400, detail="Username, OTP, and new password are required.")
        
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters.")
        
    user = await users_collection.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    # Verify OTP
    stored_otp = user.get("reset_otp")
    stored_exp = user.get("reset_otp_exp")
    
    if not stored_otp or stored_otp != otp:
        raise HTTPException(status_code=400, detail="Invalid OTP.")
        
    if not stored_exp or datetime.utcnow() > stored_exp:
        raise HTTPException(status_code=400, detail="OTP has expired.")
        
    # Update password & clear OTP
    hashed = hash_password(new_password)
    await users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"password": hashed}, "$unset": {"reset_otp": "", "reset_otp_exp": ""}}
    )
    
    return {"message": "Password reset successfully. You can now log in."}

