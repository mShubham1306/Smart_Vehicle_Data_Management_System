from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import traceback
from database import init_db, users_collection
from api import router as api_router
from auth import auth_router, get_current_user, verify_password, create_access_token
from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from bson import ObjectId
from typing import Dict, Any, Optional
from auth import decode_token, bearer_scheme


app = FastAPI(title="Smart Vehicle Insurance System API")

# Configure CORS FIRST before any routers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(api_router, prefix="/api", tags=["data"])


@app.post("/api/auth/promote-admin")
async def promote_admin(
    payload: Dict[str, Any],
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
):
    """
    Self-promotion endpoint: allows a logged-in user to upgrade their own account to admin.
    Requires their current password as confirmation.
    This is a bootstrap endpoint for the first admin setup.
    """
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    token_data = decode_token(credentials.credentials)
    if not token_data:
        raise HTTPException(status_code=401, detail="Invalid token.")

    password = str(payload.get("password", "")).strip()
    if not password:
        raise HTTPException(status_code=400, detail="Password required for confirmation.")

    user = await users_collection.find_one({"_id": ObjectId(token_data["sub"])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if not verify_password(password, user["password"]):
        raise HTTPException(status_code=403, detail="Incorrect password.")

    await users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"role": "admin"}}
    )
    # Return a new token with admin role
    token = create_access_token(
        str(user["_id"]), user["username"], "admin",
        user.get("assigned_sheet", "default")
    )
    return {
        "message": "Account promoted to admin successfully.",
        "token": token,
        "user": {
            "id": str(user["_id"]),
            "username": user["username"],
            "role": "admin",
            "assigned_sheet": user.get("assigned_sheet", "default")
        }
    }


async def migrate_user_roles():
    """
    One-time migration:
    1. Ensure every user has a 'role' field (oldest user → admin, rest → worker).
    2. Backfill 'admin_id' on workers that don't have one (link to first admin).
    Runs safely every startup — skips users that already have correct data.
    """
    try:
        # Step 1: fix missing roles
        missing_role_cursor = users_collection.find(
            {"role": {"$exists": False}},
            {"_id": 1, "username": 1}
        ).sort("_id", 1)
        missing_role_users = await missing_role_cursor.to_list(length=10000)

        if missing_role_users:
            existing_admin = await users_collection.find_one({"role": "admin"})
            first = True
            for user in missing_role_users:
                if first and existing_admin is None:
                    role = "admin"
                    first = False
                else:
                    role = "worker"
                    first = False
                await users_collection.update_one(
                    {"_id": user["_id"]},
                    {"$set": {"role": role, "assigned_sheet": "default"}}
                )
                print(f"[migration] Set {user.get('username', str(user['_id']))} → role={role}")
            print(f"[migration] Done: migrated {len(missing_role_users)} user(s).")
        else:
            print("[migration] All users already have roles.")

        # Step 2: backfill admin_id for workers that don't have it
        first_admin = await users_collection.find_one({"role": "admin"}, sort=[("_id", 1)])
        if first_admin:
            admin_id_str = str(first_admin["_id"])
            result = await users_collection.update_many(
                {"role": "worker", "admin_id": {"$exists": False}},
                {"$set": {"admin_id": admin_id_str}}
            )
            if result.modified_count:
                print(f"[migration] Backfilled admin_id for {result.modified_count} worker(s) → {admin_id_str}")

    except Exception as e:
        print(f"[migration] Migration failed (non-critical): {e}")



@app.on_event("startup")
async def startup_event():
    await init_db()
    await migrate_user_roles()


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    tb = traceback.format_exc()
    print(f"UNHANDLED ERROR: {exc}\n{tb}")
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "traceback": tb}
    )


@app.get("/")
def read_root():
    return {"message": "Smart Vehicle Insurance API is running!"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
