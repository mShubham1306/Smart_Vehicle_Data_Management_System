from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorCollection
from database import users_collection
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import os
from passlib.context import CryptContext
from jose import JWTError, jwt

auth_router = APIRouter()

# ─────────────────────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────────────────────

JWT_SECRET    = os.getenv("JWT_SECRET", "smartinsure-fallback-secret-change-me")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_DAYS = int(os.getenv("JWT_EXPIRE_DAYS", "7"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: str, username: str) -> str:
    expire = datetime.utcnow() + timedelta(days=JWT_EXPIRE_DAYS)
    payload = {
        "sub": user_id,
        "username": username,
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
# Dependency — injects current user into every protected endpoint
# ─────────────────────────────────────────────────────────────

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
) -> Dict[str, Any]:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated. Please log in.")
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token. Please log in again.")
    return {"id": payload["sub"], "username": payload.get("username", "")}


# ─────────────────────────────────────────────────────────────
# Auth Endpoints
# ─────────────────────────────────────────────────────────────

@auth_router.post("/register")
async def register(payload: Dict[str, Any]):
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

    hashed = hash_password(password)
    result = await users_collection.insert_one({
        "username": username,
        "password": hashed,
        "created_at": datetime.utcnow(),
    })

    user_id = str(result.inserted_id)
    token = create_access_token(user_id, username)

    return {
        "message": "Account created successfully.",
        "token": token,
        "user": {"id": user_id, "username": username},
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
    token = create_access_token(user_id, username)

    return {
        "message": "Login successful.",
        "token": token,
        "user": {"id": user_id, "username": username},
    }


@auth_router.get("/me")
async def me(current_user: Dict[str, Any] = Depends(get_current_user)):
    return {"user": current_user}
