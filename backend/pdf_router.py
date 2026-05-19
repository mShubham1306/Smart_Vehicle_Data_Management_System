from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from fastapi.responses import FileResponse
from typing import Dict, Any, Optional
from datetime import datetime
import uuid
import os
import aiofiles

from database import pdf_documents_collection, users_collection
from auth import get_current_user, require_admin
import audit as audit_log

router = APIRouter()

PDF_STORAGE_DIR = "uploads_temp/pdfs"
os.makedirs(PDF_STORAGE_DIR, exist_ok=True)

@router.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    vehicle_number: str = Form(...),
    sheet_name: str = Form("default"),
    generated_by_name: str = Form(""),
    agent_name: str = Form(""),
    field_agent_name: str = Form(""),
    admin_name: str = Form(""),
    current_user: Dict = Depends(get_current_user)
):
    """
    Frontend generates the PDF and uploads it here.
    We store it locally (no AWS required) and track metadata.
    """
    quote_id = f"QT-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6].upper()}"
    system_id = str(uuid.uuid4())
    
    filename = f"{quote_id}.pdf"
    filepath = os.path.join(PDF_STORAGE_DIR, filename)
    
    # Save file locally
    async with aiofiles.open(filepath, 'wb') as out_file:
        while content := await file.read(1024 * 1024):
            await out_file.write(content)
            
    # Determine admin_id based on current user
    admin_id = current_user.get("admin_id") or current_user["id"]
    
    doc = {
        "quote_id": quote_id,
        "system_id": system_id,
        "vehicle_number": vehicle_number,
        "sheet_name": sheet_name,
        "user_id": current_user["id"],
        "generated_by_username": current_user.get("username", ""),
        "generated_by_name": generated_by_name or current_user.get("username", ""),
        "admin_id": admin_id,
        "admin_name": admin_name,
        "agent_name": agent_name,
        "field_agent_name": field_agent_name,
        "user_role": current_user.get("role", "worker"),
        "local_path": filepath,
        "filename": filename,
        "generated_at": datetime.utcnow(),
    }
    
    await pdf_documents_collection.insert_one(doc)
    
    # Audit log
    await audit_log.log_action(
        audit_log.PDF_GENERATED,
        user_id=current_user["id"],
        username=current_user.get("username", ""),
        detail=f"Generated PDF for vehicle {vehicle_number} (Quote: {quote_id})",
        extra={"quote_id": quote_id, "vehicle_number": vehicle_number}
    )
    
    # Return a local URL that can be shared
    app_url = os.getenv("APP_URL", "http://localhost:8000")
    if not app_url.startswith("http"):
        app_url = f"https://{app_url}"
        
    shareable_url = f"{app_url}/api/pdf/download/{quote_id}"
    
    return {
        "quote_id": quote_id,
        "system_id": system_id,
        "url": shareable_url,
        "message": "PDF saved successfully"
    }

@router.get("/download/{quote_id}")
async def download_pdf(quote_id: str):
    """
    Publicly accessible endpoint to download/view the PDF.
    Required for WhatsApp sharing.
    """
    doc = await pdf_documents_collection.find_one({"quote_id": quote_id})
    if not doc:
        raise HTTPException(status_code=404, detail="PDF not found")
        
    filepath = doc.get("local_path")
    if not filepath or not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="PDF file missing")
        
    # Log sharing access if possible (anonymous access)
    await audit_log.log_action(
        audit_log.PDF_DOWNLOADED,
        detail=f"PDF downloaded via share link (Quote: {quote_id})",
        extra={"quote_id": quote_id}
    )
        
    return FileResponse(
        filepath, 
        filename=f"Insurance_{doc.get('vehicle_number', 'Quote')}.pdf",
        media_type="application/pdf",
        content_disposition_type="inline" # Allows viewing in browser
    )

@router.get("/history")
async def get_pdf_history(current_user: Dict = Depends(get_current_user)):
    """Get history of generated PDFs. Admins see all for their workers."""
    if current_user.get("role") == "admin":
        query = {"admin_id": current_user["id"]}
    else:
        query = {"user_id": current_user["id"]}
        
    cursor = pdf_documents_collection.find(query, {"_id": 0}).sort("generated_at", -1).limit(100)
    history = await cursor.to_list(length=100)
    
    # Format dates
    for h in history:
        if "generated_at" in h and h["generated_at"]:
            h["generated_at"] = h["generated_at"].isoformat()
            
    return {"history": history}
