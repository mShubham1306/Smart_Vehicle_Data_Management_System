from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import traceback
from database import init_db, users_collection
from api import router as api_router
from auth import auth_router


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


async def migrate_user_roles():
    """
    One-time migration: ensure every user document has a 'role' field.
    - The earliest-created user (lowest ObjectId) gets 'admin'.
    - All remaining users without a role get 'worker'.
    Runs safely every startup — skips users that already have roles set.
    """
    try:
        # Find users that are missing the role field entirely
        missing_role_cursor = users_collection.find(
            {"role": {"$exists": False}},
            {"_id": 1, "username": 1}
        ).sort("_id", 1)
        missing_role_users = await missing_role_cursor.to_list(length=10000)

        if not missing_role_users:
            print("[migration] All users already have roles — no migration needed.")
            return

        # Check if ANY admin already exists in the DB
        existing_admin = await users_collection.find_one({"role": "admin"})

        first = True
        for idx, user in enumerate(missing_role_users):
            if first and existing_admin is None:
                # Promote first (oldest) user to admin if no admin exists yet
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

    except Exception as e:
        print(f"[migration] Role migration failed (non-critical): {e}")


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
