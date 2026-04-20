from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import traceback
from database import init_db
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


@app.on_event("startup")
async def startup_event():
    await init_db()


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


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
