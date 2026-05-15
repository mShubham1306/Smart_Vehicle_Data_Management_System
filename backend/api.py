from fastapi import APIRouter, File, UploadFile, HTTPException, Form, Query, Depends
from fastapi.responses import StreamingResponse
from typing import List, Dict, Any, Optional
from database import (
    vehicles_collection, uploads_collection, schema_collection,
    sheets_collection, users_collection, learned_mappings_collection
)
import services
from services import FIXED_FIELDS, VEHICLE_FIELD, load_learned_cache_from_db
from auth import get_current_user, require_admin
from datetime import datetime, timedelta
import traceback
from io import BytesIO
import re
from bson import ObjectId
import os
import uuid
import aiofiles
from tasks import process_upload_task, process_export_task
from database import upload_tasks_collection, export_tasks_collection
import json
import redis.asyncio as redis
from fastapi.responses import FileResponse

redis_client = redis.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"))
router = APIRouter()


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def parse_expiry_date(date_str: str):
    if not date_str or date_str.strip() in ('', '-', 'N/A', 'NA', 'None'):
        return None
    s = date_str.strip()
    formats = [
        "%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d",
        "%d/%m/%y", "%d-%m-%y",
        "%d.%m.%Y", "%d.%m.%y",
        "%m/%d/%Y", "%B %d, %Y",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    m = re.match(r'(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{4})', s)
    if m:
        try:
            return datetime(int(m.group(3)), int(m.group(2)), int(m.group(1)))
        except ValueError:
            pass
    return None


def clean(name: str) -> str:
    return (name or "").strip()


def _owner(u: Dict) -> str:
    """Return the effective data-owner user_id for queries.
    Workers transparently operate on their admin's data space."""
    return u.get("data_owner_id") or u["id"]


# ─────────────────────────────────────────────────────────────
# Sheet Endpoints
# ─────────────────────────────────────────────────────────────

@router.get("/sheets")
async def list_sheets(current_user: Dict = Depends(get_current_user)):
    uid = _owner(current_user)
    cursor = sheets_collection.find({"user_id": uid}, {"_id": 0})
    sheets = await cursor.to_list(length=200)
    result = []
    for s in sheets:
        count = await vehicles_collection.count_documents({"user_id": uid, "sheet_name": s["name"]})
        result.append({"name": s["name"], "vehicle_count": count, "created_at": s.get("created_at", "")})
    result.sort(key=lambda x: (x["name"] != "default", x["name"].lower()))
    if not any(s["name"] == "default" for s in result):
        await sheets_collection.update_one(
            {"user_id": uid, "name": "default"},
            {"$setOnInsert": {"user_id": uid, "name": "default", "created_at": datetime.utcnow()}},
            upsert=True
        )
        result.insert(0, {"name": "default", "vehicle_count": 0, "created_at": ""})
    return {"sheets": result}


@router.post("/sheets")
async def create_sheet(payload: Dict[str, Any], current_user: Dict = Depends(require_admin)):
    uid = current_user["id"]
    name = clean(payload.get("name", ""))
    if not name:
        raise HTTPException(status_code=400, detail="Sheet name is required.")
    if len(name) > 50:
        raise HTTPException(status_code=400, detail="Sheet name too long (max 50 chars).")
    existing = await sheets_collection.find_one({"user_id": uid, "name": name})
    if existing:
        raise HTTPException(status_code=409, detail=f'Sheet "{name}" already exists.')
    await sheets_collection.insert_one({"user_id": uid, "name": name, "created_at": datetime.utcnow()})
    return {"message": f'Sheet "{name}" created.', "name": name}


@router.delete("/sheets/{name}")
async def delete_sheet(name: str, current_user: Dict = Depends(require_admin)):
    uid = current_user["id"]
    if name == "default":
        raise HTTPException(status_code=400, detail='Cannot delete the "default" sheet.')
    result = await sheets_collection.delete_one({"user_id": uid, "name": name})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail=f'Sheet "{name}" not found.')
    del_result = await vehicles_collection.delete_many({"user_id": uid, "sheet_name": name})
    return {"message": f'Sheet "{name}" and {del_result.deleted_count} records deleted.'}


@router.get("/sheets/{name}/columns")
async def get_sheet_columns(name: str, current_user: Dict = Depends(get_current_user)):
    uid = _owner(current_user)
    # Sample up to 500 records to discover ALL column names in this sheet
    records = await vehicles_collection.find(
        {"user_id": uid, "sheet_name": name}, {"_id": 0, "data": 1}
    ).limit(500).to_list(length=500)

    all_cols: dict = {}
    for rec in records:
        for k in rec.get("data", {}).keys():
            # Skip junk keys
            if k and not str(k).startswith("Unnamed") and k.lower() not in ("nan", "none", ""):
                all_cols[k] = True

    # Preserve FIXED_FIELDS order first, then any extra custom columns
    ordered = [f for f in FIXED_FIELDS if f in all_cols]
    extras  = [k for k in all_cols if k not in FIXED_FIELDS]
    columns = ordered + extras
    # If the sheet has no data yet, provide the FIXED_FIELDS so the frontend form has baseline fields to populate
    if not columns:
        columns = FIXED_FIELDS
        
    return {"sheet_name": name, "columns": columns, "has_data": bool(all_cols)}


# ─────────────────────────────────────────────────────────────
# Schema
# ─────────────────────────────────────────────────────────────

@router.get("/schema")
async def get_schema(current_user: Dict = Depends(get_current_user)):
    return {"columns": FIXED_FIELDS, "vehicle_col": VEHICLE_FIELD}


# ─────────────────────────────────────────────────────────────
# Upload (admin only)
# ─────────────────────────────────────────────────────────────

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    sheet_name: str = Form("default"),
    current_user: Dict = Depends(require_admin)
):
    uid = current_user["id"]
    sheet_name = clean(sheet_name) or "default"
    try:
        filename = file.filename.lower()
        if not (filename.endswith(".xlsx") or filename.endswith(".xls") or filename.endswith(".csv")):
            raise HTTPException(status_code=400, detail="Only Excel (.xlsx, .xls) and CSV files are supported.")

        os.makedirs("uploads_temp", exist_ok=True)
        task_id = str(uuid.uuid4())
        filepath = os.path.join("uploads_temp", f"{task_id}_{filename}")
        
        async with aiofiles.open(filepath, 'wb') as out_file:
            while content := await file.read(1024 * 1024):  # 1MB chunks
                await out_file.write(content)

        # Trigger celery task
        process_upload_task.apply_async(
            args=[filepath, filename, sheet_name, uid],
            task_id=task_id
        )
        
        await upload_tasks_collection.insert_one({
            "task_id": task_id,
            "status": "queued",
            "filename": filename,
            "user_id": uid,
            "created_at": datetime.utcnow()
        })

        return {
            "message": "File is being processed in the background.",
            "task_id": task_id
        }

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")


@router.get("/upload/status/{task_id}")
async def get_upload_status(task_id: str, current_user: Dict = Depends(require_admin)):
    task = await upload_tasks_collection.find_one({"task_id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


# ─────────────────────────────────────────────────────────────
# Vehicles CRUD (data_owner_id scoped)
# ─────────────────────────────────────────────────────────────

@router.get("/search/{vehicle_number}")
async def search_vehicle(vehicle_number: str, sheet: Optional[str] = Query(None),
                         current_user: Dict = Depends(get_current_user)):
    uid = _owner(current_user)
    # Normalize: strip ALL non-alphanumeric chars, uppercase
    v_num = re.sub(r'[^A-Z0-9]', '', vehicle_number.upper().strip())
    v_num_lower = v_num.lower()

    vehicle = None
    fuzzy_match = False

    # ── Tier 1: Exact vehicle_number match ──────────────────────────
    vehicle = await vehicles_collection.find_one(
        {"user_id": uid, "vehicle_number": v_num}, {"_id": 0}
    )

    # ── Tier 2: searchable_tokens array match ───────────────────────
    if not vehicle:
        vehicle = await vehicles_collection.find_one(
            {"user_id": uid, "searchable_tokens": {"$in": [v_num, v_num_lower, vehicle_number.upper(), vehicle_number.lower()]}},
            {"_id": 0}
        )

    # ── Tier 3: Fuzzy prefix regex on vehicle_number ─────────────────
    if not vehicle and len(v_num) >= 4:
        prefix = re.escape(v_num[:6]) if len(v_num) >= 6 else re.escape(v_num)
        vehicle = await vehicles_collection.find_one(
            {"user_id": uid, "vehicle_number": {"$regex": f"^{prefix}", "$options": "i"}},
            {"_id": 0}
        )
        if vehicle:
            fuzzy_match = True

    # ── Tier 4: Emergency full data-value scan (Optimized Text Lookup) ───
    if not vehicle:
        try:
            vehicle = await vehicles_collection.find_one(
                {"user_id": uid, "$text": {"$search": f'"{v_num}"'}},
                {"_id": 0}
            )
            if vehicle:
                fuzzy_match = True
        except Exception as e:
            print(f"[Search] Text lookup failed: {e}")

    if not vehicle:
        raise HTTPException(
            status_code=404,
            detail=f"No record found for vehicle number: {v_num}. "
                   f"Check the plate format and ensure the file was uploaded with a recognisable vehicle column."
        )

    raw_data = vehicle.get("data", {})

    # Build structured response: canonical FIXED_FIELDS first, then ALL extra columns
    structured: Dict[str, Any] = {}
    for field in FIXED_FIELDS:
        structured[field] = raw_data.get(field, "")
    for k, v in raw_data.items():
        if k not in structured:
            structured[k] = v

    return {
        "vehicle_number": vehicle["vehicle_number"],
        "sheet_name": vehicle.get("sheet_name", "default"),
        "fuzzy_match": fuzzy_match,
        "data": structured,
    }


@router.get("/debug/record")
async def debug_record(sheet: Optional[str] = Query(None), vn: str = Query(...),
                       current_user: Dict = Depends(require_admin)):
    """Admin-only: inspect the raw stored document for a vehicle — useful for diagnosing mapping issues."""
    uid = _owner(current_user)
    v_num = re.sub(r'[^A-Z0-9]', '', vn.upper().strip())
    query: Dict[str, Any] = {"user_id": uid, "vehicle_number": v_num}
    if sheet:
        query["sheet_name"] = clean(sheet)
    vehicle = await vehicles_collection.find_one(query)
    if not vehicle:
        # Try fuzzy
        prefix = re.escape(v_num[:6]) if len(v_num) >= 6 else re.escape(v_num)
        vehicle = await vehicles_collection.find_one(
            {"user_id": uid, "vehicle_number": {"$regex": f"^{prefix}", "$options": "i"}}
        )
    if not vehicle:
        raise HTTPException(status_code=404, detail=f"No raw record found for: {v_num}")
    vehicle["_id"] = str(vehicle["_id"])
    return {"raw_document": vehicle}


@router.post("/vehicles")
async def create_or_update_vehicle(payload: Dict[str, Any], current_user: Dict = Depends(get_current_user)):
    uid = _owner(current_user)
    vehicle_number = payload.get("vehicle_number", "").replace(" ", "").upper().strip()
    if not vehicle_number:
        raise HTTPException(status_code=400, detail="vehicle_number is required")

    sheet_name = clean(payload.get("sheet_name", "default")) or "default"

    await sheets_collection.update_one(
        {"user_id": uid, "name": sheet_name},
        {"$setOnInsert": {"user_id": uid, "name": sheet_name, "created_at": datetime.utcnow()}},
        upsert=True
    )

    incoming_data = payload.get("data", {})
    data = {field: str(incoming_data.get(field, "")).strip() for field in FIXED_FIELDS}
    data[VEHICLE_FIELD] = vehicle_number
    record = {"user_id": uid, "vehicle_number": vehicle_number, "sheet_name": sheet_name, "data": data}
    await vehicles_collection.update_one(
        {"user_id": uid, "vehicle_number": vehicle_number, "sheet_name": sheet_name},
        {"$set": record}, upsert=True)
    return {"message": "Record saved successfully", "vehicle_number": vehicle_number, "sheet_name": sheet_name}


@router.get("/vehicles/{vehicle_number}")
async def get_vehicle(vehicle_number: str, sheet: Optional[str] = Query(None),
                      current_user: Dict = Depends(get_current_user)):
    uid = _owner(current_user)
    v_num = vehicle_number.replace(" ", "").upper().strip()
    query: Dict[str, Any] = {"user_id": uid, "vehicle_number": v_num}
    if sheet:
        query["sheet_name"] = clean(sheet)
    vehicle = await vehicles_collection.find_one(query, {"_id": 0})
    if not vehicle:
        raise HTTPException(status_code=404, detail=f"No record found for: {v_num}")
    raw_data = vehicle.get("data", {})
    structured = {field: raw_data.get(field, "") for field in FIXED_FIELDS}
    return {"vehicle_number": vehicle["vehicle_number"], "sheet_name": vehicle.get("sheet_name", "default"),
            "data": structured}


@router.get("/vehicles")
async def list_vehicles(page: int = 1, limit: int = 50, sheet: Optional[str] = Query("default"),
                        current_user: Dict = Depends(require_admin)):
    uid = current_user["id"]
    sheet = clean(sheet or "default")
    skip = (page - 1) * limit
    cursor = vehicles_collection.find({"user_id": uid, "sheet_name": sheet}, {"_id": 0}).skip(skip).limit(limit)
    vehicles = await cursor.to_list(length=limit)
    total = await vehicles_collection.count_documents({"user_id": uid, "sheet_name": sheet})
    return {"vehicles": vehicles, "total": total, "page": page, "limit": limit, "sheet_name": sheet}


# ─────────────────────────────────────────────────────────────
# Dashboard Stats
# ─────────────────────────────────────────────────────────────

@router.get("/dashboard/stats")
async def get_dashboard_stats(sheet: Optional[str] = Query("default"),
                              current_user: Dict = Depends(get_current_user)):
    uid = _owner(current_user)
    sheet = clean(sheet or "default")
    cache_key = f"dashboard_stats_{uid}_{sheet}"
    cached = await redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    base_query: Dict[str, Any] = {"user_id": uid, "sheet_name": sheet}

    total_vehicles = await vehicles_collection.count_documents(base_query)
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    seven_days_later  = today + timedelta(days=7)
    thirty_days_later = today + timedelta(days=30)

    all_vehicles = await vehicles_collection.find(base_query, {"_id": 0, "vehicle_number": 1, "data": 1}).to_list(length=50000)

    active_count = expired_count = no_insurance_count = expiring_7 = expiring_30 = 0
    monthly_data: Dict[str, int] = {}
    expiry_by_month: Dict[str, int] = {}
    company_counts: Dict[str, int] = {}
    fuel_counts: Dict[str, int] = {}

    for v in all_vehicles:
        data = v.get("data", {})
        expiry_dt = parse_expiry_date(data.get("expiredInsuranceUpto", ""))

        if expiry_dt is None:              no_insurance_count += 1
        elif expiry_dt < today:            expired_count += 1
        else:                              active_count += 1

        if expiry_dt:
            if today <= expiry_dt <= seven_days_later:   expiring_7  += 1
            if today <= expiry_dt <= thirty_days_later:  expiring_30 += 1
            mk = expiry_dt.strftime("%b %Y")
            expiry_by_month[mk] = expiry_by_month.get(mk, 0) + 1

        company = data.get("vehicleInsuranceCompanyName", "").strip()
        if company and company not in ('', '-', 'N/A'):
            company_counts[company] = company_counts.get(company, 0) + 1

        fuel = data.get("fuelType", "").strip()
        if fuel and fuel not in ('', '-', 'N/A'):
            fuel_counts[fuel] = fuel_counts.get(fuel, 0) + 1

    all_uploads = await uploads_collection.find({"user_id": uid, "sheet_name": sheet}, {"_id": 0}).sort("timestamp", 1).to_list(length=1000)
    for u in all_uploads:
        if "timestamp" in u:
            mk = u["timestamp"].strftime("%b %Y")
            monthly_data[mk] = monthly_data.get(mk, 0) + u.get("inserted", 0)

    recent_uploads = await uploads_collection.find({"user_id": uid, "sheet_name": sheet}, {"_id": 0}).sort("timestamp", -1).limit(5).to_list(length=5)
    for u in recent_uploads:
        if "timestamp" in u:
            u["timestamp"] = u["timestamp"].isoformat()

    recent_vehicles_list = await vehicles_collection.find(base_query, {"_id": 0}).sort("_id", -1).limit(10).to_list(length=10)
    recent_recs = []
    for v in recent_vehicles_list:
        data = v.get("data", {})
        expiry_str = data.get("expiredInsuranceUpto", "")
        expiry_dt = parse_expiry_date(expiry_str)
        if expiry_dt is None:                          status = "no-data"
        elif expiry_dt < today:                        status = "expired"
        elif expiry_dt <= seven_days_later:            status = "expiring-soon"
        else:                                          status = "active"
        recent_recs.append({
            "vehicle_number": v.get("vehicle_number", ""),
            "owner":   data.get("ownerName", "—"),
            "company": data.get("vehicleInsuranceCompanyName", "—"),
            "expiry":  expiry_str or "—",
            "status":  status,
        })

    top_companies = sorted(company_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    top_fuels     = sorted(fuel_counts.items(),    key=lambda x: x[1], reverse=True)[:6]

    def month_sort_key(k):
        try: return datetime.strptime(k, "%b %Y")
        except: return datetime.min

    sorted_expiry_months = sorted(expiry_by_month.keys(), key=month_sort_key)[-12:]
    sorted_monthly_keys  = sorted(monthly_data.keys(),    key=month_sort_key)[-12:]

    stats_result = {
        "sheet_name": sheet,
        "total_vehicles":       total_vehicles,
        "active_insurance":     active_count,
        "expired_insurance":    expired_count,
        "no_insurance_data":    no_insurance_count,
        "expiring_in_7_days":   expiring_7,
        "expiring_in_30_days":  expiring_30,
        "recent_uploads":       recent_uploads,
        "recent_vehicles":      recent_recs,
        "chart_monthly_labels": sorted_monthly_keys,
        "chart_monthly_data":   [monthly_data[k]    for k in sorted_monthly_keys],
        "chart_expiry_labels":  sorted_expiry_months,
        "chart_expiry_data":    [expiry_by_month[k] for k in sorted_expiry_months],
        "chart_pie_labels":     ["Active", "Expired", "No Data"],
        "chart_pie_data":       [active_count, expired_count, no_insurance_count],
        "top_companies":        [{"name": k, "count": v} for k, v in top_companies],
        "fuel_types":           [{"name": k, "count": v} for k, v in top_fuels],
    }
    await redis_client.setex(cache_key, 300, json.dumps(stats_result))
    return stats_result


# ─────────────────────────────────────────────────────────────
# Export (admin only)
# ─────────────────────────────────────────────────────────────

@router.get("/export")
async def export_vehicles(sheet: Optional[str] = Query("default"),
                          current_user: Dict = Depends(require_admin)):
    uid = current_user["id"]
    sheet = clean(sheet or "default")
    task_id = str(uuid.uuid4())
    process_export_task.apply_async(args=[sheet, uid], task_id=task_id)
    await export_tasks_collection.insert_one({
        "task_id": task_id,
        "status": "queued",
        "sheet_name": sheet,
        "user_id": uid,
        "created_at": datetime.utcnow()
    })
    return {"message": "Export task started", "task_id": task_id}

@router.get("/export/download/{task_id}")
async def download_export(task_id: str, current_user: Dict = Depends(require_admin)):
    task = await export_tasks_collection.find_one({"task_id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Export not ready")
    filepath = os.path.join("exports_temp", f"{task_id}.xlsx")
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File moved or deleted")
    safe_name = task.get("sheet_name", "export").replace(" ", "_").replace("/", "-")
    return FileResponse(filepath, filename=f"{safe_name}_export.xlsx")


# ─────────────────────────────────────────────────────────────
# Admin — Worker Management
# ─────────────────────────────────────────────────────────────

@router.get("/admin/users")
async def list_users(current_user: Dict = Depends(require_admin)):
    admin_id = current_user["id"]
    # Admins see themselves + workers they created
    cursor = users_collection.find(
        {"$or": [{"_id": ObjectId(admin_id)}, {"admin_id": admin_id}]},
        {"_id": 1, "username": 1, "role": 1, "assigned_sheet": 1, "created_at": 1, "admin_id": 1}
    )
    users = await cursor.to_list(length=500)
    return {"users": [{
        "id": str(u["_id"]),
        "username": u.get("username", ""),
        "role": u.get("role", "worker"),
        "assigned_sheet": u.get("assigned_sheet", "default"),
        "admin_id": u.get("admin_id"),
        "created_at": u.get("created_at", "").isoformat() if u.get("created_at") else "",
    } for u in users]}


@router.post("/admin/workers")
async def create_worker(payload: Dict[str, Any], current_user: Dict = Depends(require_admin)):
    """Admin creates a worker — automatically linked to this admin's data space."""
    from auth import hash_password
    admin_id = current_user["id"]
    username = str(payload.get("username", "")).strip().lower()
    password = str(payload.get("password", "")).strip()

    if not username or len(username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters.")
    if not password or len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    if await users_collection.find_one({"username": username}):
        raise HTTPException(status_code=409, detail=f'Username "{username}" is already taken.')

    result = await users_collection.insert_one({
        "username": username,
        "password": hash_password(password),
        "role": "worker",
        "assigned_sheet": "default",
        "admin_id": admin_id,
        "created_at": datetime.utcnow(),
    })
    return {"message": f'Worker "{username}" created.', "id": str(result.inserted_id), "username": username}


@router.patch("/admin/users/{user_id}")
async def update_user(user_id: str, payload: Dict[str, Any], current_user: Dict = Depends(require_admin)):
    updates: Dict[str, Any] = {}
    if "role" in payload and payload["role"] in ("admin", "worker"):
        updates["role"] = payload["role"]
    if "assigned_sheet" in payload:
        updates["assigned_sheet"] = str(payload["assigned_sheet"]).strip() or "default"
    if "password" in payload and payload["password"]:
        from auth import hash_password
        updates["password"] = hash_password(str(payload["password"]).strip())
    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update.")
    try:
        result = await users_collection.update_one({"_id": ObjectId(user_id)}, {"$set": updates})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID.")
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found.")
    return {"message": "User updated.", "updates": {k: v for k, v in updates.items() if k != "password"}}


@router.delete("/admin/users/{user_id}")
async def delete_worker(user_id: str, current_user: Dict = Depends(require_admin)):
    admin_id = current_user["id"]
    try:
        obj_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID.")
    user = await users_collection.find_one({"_id": obj_id, "admin_id": admin_id, "role": "worker"})
    if not user:
        raise HTTPException(status_code=404, detail="Worker not found or not yours to delete.")
    await users_collection.delete_one({"_id": obj_id})
    return {"message": "Worker deleted."}


# ─────────────────────────────────────────────────────────────
# Admin — Diagnostics & Migration
# ─────────────────────────────────────────────────────────────

import re as _re

_PLATE_RE = _re.compile(r'^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{1,4}$', _re.IGNORECASE)


def _looks_like_plate(v: str) -> bool:
    return bool(_PLATE_RE.match(_re.sub(r'[^A-Z0-9]', '', str(v).upper().strip())))


@router.get("/admin/diagnose")
async def diagnose(current_user: Dict = Depends(require_admin)):
    """Show DB state: total records, samples of vehicle_number & data keys per sheet."""
    uid = current_user["id"]
    total = await vehicles_collection.count_documents({"user_id": uid})
    empty_vn = await vehicles_collection.count_documents({"user_id": uid, "vehicle_number": {"$in": ["", None]}})

    sheets_cur = sheets_collection.find({"user_id": uid}, {"_id": 0, "name": 1})
    sheet_names = [s["name"] for s in await sheets_cur.to_list(length=100)]

    sheet_info = []
    for sname in sheet_names:
        count = await vehicles_collection.count_documents({"user_id": uid, "sheet_name": sname})
        sample = await vehicles_collection.find_one({"user_id": uid, "sheet_name": sname}, {"vehicle_number": 1, "data": 1})
        sheet_info.append({
            "sheet": sname, "count": count,
            "sample_vn": sample.get("vehicle_number") if sample else None,
            "sample_data_keys": list(sample.get("data", {}).keys())[:10] if sample else [],
        })

    return {
        "total_records": total,
        "empty_vehicle_number_records": empty_vn,
        "sheets": sheet_info,
    }


@router.post("/admin/migrate/fix-vehicle-numbers")
async def migrate_fix_vehicle_numbers(current_user: Dict = Depends(require_admin)):
    """
    Scan ALL records for this admin. For any record with empty/missing vehicle_number,
    try to recover a plate number from its stored data fields using plate-regex detection.
    Updates the record in-place. Returns counts of fixed / unfixed records.
    """
    uid = current_user["id"]
    fixed = 0
    unfixable = 0
    total_scanned = 0

    # Process all records — not just empty ones — to also re-normalize plates
    cursor = vehicles_collection.find({"user_id": uid}, {"_id": 1, "vehicle_number": 1, "data": 1, "sheet_name": 1})
    async for doc in cursor:
        total_scanned += 1
        vn = str(doc.get("vehicle_number", "")).strip()
        data = doc.get("data", {})

        # If vehicle_number already looks good, skip
        if vn and _looks_like_plate(vn):
            continue

        # Try every field in data to find a plate-like value
        found_plate = None
        for key, val in data.items():
            candidate = _re.sub(r'[^A-Z0-9]', '', str(val).upper().strip())
            if candidate and _looks_like_plate(candidate):
                found_plate = candidate
                break

        if found_plate:
            # Update vehicle_number and also fix the Vehicle field in data
            data["Vehicle"] = found_plate
            await vehicles_collection.update_one(
                {"_id": doc["_id"]},
                {"$set": {"vehicle_number": found_plate, "data": data}}
            )
            fixed += 1
        else:
            unfixable += 1

    return {
        "message": f"Migration complete. Fixed={fixed}, Unfixable={unfixable}, Total scanned={total_scanned}",
        "fixed": fixed,
        "unfixable": unfixable,
        "total_scanned": total_scanned,
        "action_needed": "Re-upload files for any unfixable records." if unfixable > 0 else "All records are now searchable.",
    }


@router.delete("/admin/purge-bad-records")
async def purge_bad_records(current_user: Dict = Depends(require_admin)):
    """Delete records that have empty vehicle_number (they cannot be searched) so the file can be cleanly re-uploaded."""
    uid = current_user["id"]
    result = await vehicles_collection.delete_many({
        "user_id": uid,
        "vehicle_number": {"$in": ["", None]}
    })
    return {
        "message": f"Deleted {result.deleted_count} records with empty vehicle_number. Re-upload your file to restore them.",
        "deleted": result.deleted_count,
    }


# ─────────────────────────────────────────────────────────────
# Schema Intelligence — Learned Mappings
# ─────────────────────────────────────────────────────────────

@router.get("/admin/schema-intelligence")
async def get_learned_mappings(current_user: Dict = Depends(require_admin)):
    """Return all header→canonical mappings the system has learned for this admin."""
    uid = current_user["id"]
    # Also include global (user_id="system") mappings
    cursor = learned_mappings_collection.find(
        {"user_id": {"$in": [uid, "system"]}},
        {"_id": 0, "normalized_header": 1, "original_header": 1,
         "canonical_field": 1, "count": 1, "last_seen": 1}
    ).sort("count", -1)
    mappings = await cursor.to_list(length=500)
    return {"total": len(mappings), "mappings": mappings}


@router.post("/admin/schema-intelligence")
async def teach_mapping(payload: Dict[str, Any], current_user: Dict = Depends(require_admin)):
    """Manually teach the system: {header: 'Auto Reg ID', canonical: 'Vehicle'}."""
    uid = current_user["id"]
    header = str(payload.get("header", "")).strip()
    canonical = str(payload.get("canonical", "")).strip()
    if not header or not canonical:
        raise HTTPException(status_code=400, detail="Both 'header' and 'canonical' are required.")
    if canonical not in FIXED_FIELDS:
        raise HTTPException(status_code=400, detail=f"'{canonical}' is not a valid canonical field name.")

    norm_key = services.normalize_header_key(header)
    await services.persist_learned_mapping(norm_key, canonical, header, uid)
    return {"message": f"Taught: '{header}' → '{canonical}'", "normalized_key": norm_key}


@router.delete("/admin/schema-intelligence/{header_norm}")
async def delete_learned_mapping(header_norm: str, current_user: Dict = Depends(require_admin)):
    """Delete a specific learned mapping by its normalized key."""
    uid = current_user["id"]
    result = await learned_mappings_collection.delete_one(
        {"normalized_header": header_norm, "user_id": uid}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Mapping not found.")
    # Also remove from in-memory cache
    services._learned_cache.pop(header_norm, None)
    return {"message": f"Deleted mapping for '{header_norm}'."}


@router.get("/admin/startup-cache")
async def warm_learned_cache(current_user: Dict = Depends(require_admin)):
    """Reload learned mappings from DB into in-memory cache (useful after manual edits)."""
    uid = current_user["id"]
    cursor = learned_mappings_collection.find(
        {"user_id": {"$in": [uid, "system"]}},
        {"_id": 0, "normalized_header": 1, "canonical_field": 1}
    )
    mappings = await cursor.to_list(length=5000)
    load_learned_cache_from_db(mappings)
    return {"message": f"Cache reloaded with {len(mappings)} mappings."}
