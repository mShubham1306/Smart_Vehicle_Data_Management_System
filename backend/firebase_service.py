"""
firebase_service.py — Asynchronous Firebase Authentication REST API Service
Wraps SignUp, SignIn, Email Verification, Password Reset, and User Profile lookup.
Supports high-performance Async HTTP requests via httpx.
"""
import os
import httpx
from fastapi import HTTPException

def get_firebase_api_key() -> str:
    return os.getenv("FIREBASE_API_KEY", "").strip()

def is_firebase_enabled() -> bool:
    return bool(get_firebase_api_key())

def friendly_firebase_error(firebase_msg: str) -> str:
    msg = firebase_msg.upper()
    if "EMAIL_EXISTS" in msg:
        return "An account with this email already exists."
    elif "EMAIL_NOT_FOUND" in msg or "USER_NOT_FOUND" in msg:
        return "No account found with this email."
    elif "INVALID_PASSWORD" in msg or "INVALID_LOGIN_CREDENTIALS" in msg:
        return "Incorrect email or password."
    elif "USER_DISABLED" in msg:
        return "This account has been disabled."
    elif "WEAK_PASSWORD" in msg:
        return "Password is too weak. Must be at least 6 characters."
    elif "INVALID_EMAIL" in msg:
        return "Please enter a valid email address."
    elif "TOO_MANY_ATTEMPTS_TRY_LATER" in msg:
        return "Too many failed attempts due to security. Please try again later."
    return "Authentication failed. Please check your credentials and try again."

async def firebase_sign_up(email: str, password: str) -> dict:
    """Registers a user in Firebase Auth via REST API."""
    api_key = get_firebase_api_key()
    if not api_key:
        raise HTTPException(status_code=500, detail="Firebase is not configured on this server.")
    
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={api_key}"
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            response = await client.post(
                url,
                json={"email": email, "password": password, "returnSecureToken": True}
            )
            if response.status_code != 200:
                err_data = response.json()
                err_msg = err_data.get("error", {}).get("message", "Registration failed.")
                raise HTTPException(status_code=response.status_code, detail=friendly_firebase_error(err_msg))
            return response.json()
        except httpx.RequestError as exc:
            print(f"[Firebase SignUp Connection Error] {exc}")
            raise HTTPException(status_code=503, detail="Unable to connect to Firebase service. Please try again later.")

async def firebase_sign_in(email: str, password: str) -> dict:
    """Authenticates a user with email and password in Firebase Auth via REST API."""
    api_key = get_firebase_api_key()
    if not api_key:
        raise HTTPException(status_code=500, detail="Firebase is not configured on this server.")
    
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}"
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            response = await client.post(
                url,
                json={"email": email, "password": password, "returnSecureToken": True}
            )
            if response.status_code != 200:
                err_data = response.json()
                err_msg = err_data.get("error", {}).get("message", "Login failed.")
                raise HTTPException(status_code=response.status_code, detail=friendly_firebase_error(err_msg))
            return response.json()
        except httpx.RequestError as exc:
            print(f"[Firebase SignIn Connection Error] {exc}")
            raise HTTPException(status_code=503, detail="Unable to connect to Firebase service. Please try again later.")

async def firebase_send_verification_email(id_token: str) -> bool:
    """Sends email verification link to the user from Firebase Auth."""
    api_key = get_firebase_api_key()
    if not api_key:
        return False
    
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key={api_key}"
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            response = await client.post(
                url,
                json={"requestType": "VERIFY_EMAIL", "idToken": id_token}
            )
            return response.status_code == 200
        except Exception as exc:
            print(f"[Firebase Send Verification Error] {exc}")
            return False

async def firebase_send_password_reset_email(email: str) -> bool:
    """Sends a password reset link to the user's email from Firebase Auth."""
    api_key = get_firebase_api_key()
    if not api_key:
        return False
    
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key={api_key}"
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            response = await client.post(
                url,
                json={"requestType": "PASSWORD_RESET", "email": email}
            )
            return response.status_code == 200
        except Exception as exc:
            print(f"[Firebase Send Password Reset Error] {exc}")
            return False

async def firebase_get_user_info(id_token: str) -> dict:
    """Retrieves user profile info (including emailVerified status) from Firebase."""
    api_key = get_firebase_api_key()
    if not api_key:
        return {}
    
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={api_key}"
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            response = await client.post(url, json={"idToken": id_token})
            if response.status_code != 200:
                return {}
            users = response.json().get("users", [])
            return users[0] if users else {}
        except Exception as exc:
            print(f"[Firebase Get User Info Error] {exc}")
            return {}

async def firebase_delete_account(id_token: str) -> bool:
    """Deletes the authenticated user account from Firebase Auth."""
    api_key = get_firebase_api_key()
    if not api_key:
        return False
    
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:delete?key={api_key}"
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            response = await client.post(url, json={"idToken": id_token})
            return response.status_code == 200
        except Exception as exc:
            print(f"[Firebase Delete Account Error] {exc}")
            return False
