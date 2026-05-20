from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form, Request
from fastapi.responses import FileResponse
from typing import Dict, Any, Optional
from datetime import datetime
from bson import ObjectId
import uuid
import os
import aiofiles

from database import pdf_documents_collection, users_collection
from auth import get_current_user
import audit as audit_log

router = APIRouter()

PDF_STORAGE_DIR = "uploads_temp/pdfs"
os.makedirs(PDF_STORAGE_DIR, exist_ok=True)

# Optional AWS S3 (enabled when env vars are set)
AWS_S3_BUCKET = os.getenv("AWS_S3_BUCKET", "")
AWS_S3_REGION = os.getenv("AWS_S3_REGION", "ap-south-1")
AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID", "")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "")


async def _resolve_admin_name(admin_id: Optional[str], fallback: str = "") -> str:
    if fallback:
        return fallback
    if not admin_id:
        return ""
    try:
        admin = await users_collection.find_one(
            {"_id": ObjectId(admin_id)},
            {"username": 1}
        )
        return admin.get("username", "") if admin else ""
    except Exception:
        return ""


async def _upload_to_s3_if_configured(local_path: str, quote_id: str) -> Optional[str]:
    if not (AWS_S3_BUCKET and AWS_ACCESS_KEY and AWS_SECRET_KEY):
        return None
    try:
        import boto3
        s3 = boto3.client(
            "s3",
            region_name=AWS_S3_REGION,
            aws_access_key_id=AWS_ACCESS_KEY,
            aws_secret_access_key=AWS_SECRET_KEY,
        )
        key = f"quotes/{quote_id}.pdf"
        s3.upload_file(local_path, AWS_S3_BUCKET, key, ExtraArgs={"ContentType": "application/pdf"})
        return f"https://{AWS_S3_BUCKET}.s3.{AWS_S3_REGION}.amazonaws.com/{key}"
    except Exception as exc:
        print(f"[pdf] S3 upload skipped: {exc}")
        return None


@router.post("/upload")
async def upload_pdf(
    request: Request,
    file: UploadFile = File(...),
    vehicle_number: str = Form(...),
    sheet_name: str = Form("default"),
    generated_by_name: str = Form(""),
    agent_name: str = Form(""),
    field_agent_name: str = Form(""),
    admin_name: str = Form(""),
    current_user: Dict = Depends(get_current_user),
):
    """
    Frontend generates the PDF and uploads it here.
    Stores locally and optionally on S3; tracks full audit metadata.
    """
    quote_id = f"Q{datetime.utcnow().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:6].upper()}"
    system_id = str(uuid.uuid4())
    generated_at = datetime.utcnow()

    filename = f"{quote_id}.pdf"
    filepath = os.path.join(PDF_STORAGE_DIR, filename)

    async with aiofiles.open(filepath, "wb") as out_file:
        while content := await file.read(1024 * 1024):
            await out_file.write(content)

    role = current_user.get("role", "worker")
    admin_id = current_user.get("admin_id") or (current_user["id"] if role == "admin" else None)
    if role == "admin":
        admin_id = current_user["id"]

    resolved_admin_name = await _resolve_admin_name(admin_id, admin_name)

    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")

    s3_url = await _upload_to_s3_if_configured(filepath, quote_id)

    app_url = os.getenv("APP_URL", "http://localhost:8000")
    if not app_url.startswith("http"):
        app_url = f"https://{app_url}"
    shareable_url = s3_url or f"{app_url}/api/pdf/download/{quote_id}"

    doc = {
        "quote_id": quote_id,
        "system_id": system_id,
        "vehicle_number": vehicle_number.upper().replace(" ", ""),
        "sheet_name": sheet_name,
        "user_id": current_user["id"],
        "generated_by_username": current_user.get("username", ""),
        "generated_by_name": generated_by_name or current_user.get("username", ""),
        "admin_id": admin_id,
        "admin_name": resolved_admin_name,
        "agent_name": agent_name,
        "field_agent_name": field_agent_name,
        "user_role": role,
        "local_path": filepath,
        "filename": filename,
        "s3_url": s3_url,
        "url": shareable_url,
        "generated_at": generated_at,
        "generated_ip": client_ip,
        "user_agent": user_agent[:300] if user_agent else "",
        "hierarchy": {
            "admin_id": admin_id,
            "admin_name": resolved_admin_name,
            "generated_by_user_id": current_user["id"],
            "generated_by_name": generated_by_name or current_user.get("username", ""),
            "agent_name": agent_name,
            "field_agent_name": field_agent_name,
            "role": role,
        },
    }

    await pdf_documents_collection.insert_one(doc)

    await audit_log.log_action(
        audit_log.PDF_GENERATED,
        user_id=current_user["id"],
        username=current_user.get("username", ""),
        ip=client_ip,
        user_agent=user_agent,
        detail=f"Generated premium breakup PDF for {vehicle_number} (Quote: {quote_id})",
        extra={
            "quote_id": quote_id,
            "system_id": system_id,
            "vehicle_number": vehicle_number,
            "admin_id": admin_id,
            "admin_name": resolved_admin_name,
            "s3_url": s3_url,
        },
    )

    return {
        "quote_id": quote_id,
        "system_id": system_id,
        "url": shareable_url,
        "admin_name": resolved_admin_name,
        "generated_at": generated_at.isoformat(),
        "message": "PDF saved successfully",
    }


@router.get("/download/{quote_id}")
async def download_pdf(quote_id: str, request: Request):
    """Public download/view endpoint for WhatsApp sharing."""
    doc = await pdf_documents_collection.find_one({"quote_id": quote_id})
    if not doc:
        raise HTTPException(status_code=404, detail="PDF not found")

    if doc.get("s3_url"):
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url=doc["s3_url"], status_code=302)

    filepath = doc.get("local_path")
    if not filepath or not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="PDF file missing")

    client_ip = request.client.host if request.client else None
    await audit_log.log_action(
        audit_log.PDF_DOWNLOADED,
        ip=client_ip,
        user_agent=request.headers.get("user-agent", ""),
        detail=f"PDF downloaded via share link (Quote: {quote_id})",
        extra={"quote_id": quote_id, "vehicle_number": doc.get("vehicle_number")},
    )

    return FileResponse(
        filepath,
        filename=f"Premium_Breakup_{doc.get('vehicle_number', 'Quote')}.pdf",
        media_type="application/pdf",
        content_disposition_type="inline",
    )


@router.get("/history")
async def get_pdf_history(current_user: Dict = Depends(get_current_user)):
    """History of generated PDFs. Admins see all under their workers."""
    if current_user.get("role") == "admin":
        query = {"admin_id": current_user["id"]}
    else:
        query = {"user_id": current_user["id"]}

    cursor = pdf_documents_collection.find(
        query,
        {"_id": 0, "local_path": 0},
    ).sort("generated_at", -1).limit(100)
    history = await cursor.to_list(length=100)

    for h in history:
        if h.get("generated_at"):
            h["generated_at"] = h["generated_at"].isoformat()

    return {"history": history}
