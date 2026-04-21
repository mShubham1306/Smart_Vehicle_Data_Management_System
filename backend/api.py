from fastapi import APIRouter, File, UploadFile, HTTPException, Form, Query, Depends
from fastapi.responses import StreamingResponse
from typing import List, Dict, Any, Optional
from database import vehicles_collection, uploads_collection, schema_collection, sheets_collection, users_collection
import services
from services import FIXED_FIELDS, VEHICLE_FIELD
from auth import get_current_user, require_admin
from datetime import datetime, timedelta
import traceback
from io import BytesIO
import re
from bson import ObjectId

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


# ─────────────────────────────────────────────────────────────
# Sheet Endpoints (user-scoped)
# ─────────────────────────────────────────────────────────────

@router.get("/sheets")
async def list_sheets(current_user: Dict = Depends(get_current_user)):
    uid = current_user["id"]
    cursor = sheets_collection.find({"user_id": uid}, {"_id": 0})
    sheets = await cursor.to_list(length=200)
    result = []
    for s in sheets:
        count = await vehicles_collection.count_documents({"user_id": uid, "sheet_name": s["name"]})
        result.append({"name": s["name"], "vehicle_count": count, "created_at": s.get("created_at", "")})
    result.sort(key=lambda x: (x["name"] != "default", x["name"].lower()))
    # Auto-create default if missing
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
    current_user: Dict = Depends(get_current_user)
):
    uid = current_user["id"]
    role = current_user.get("role", "worker")
    assigned_sheet = current_user.get("assigned_sheet", "default")
    try:
        # Workers can only upload to their assigned sheet
        if role == "worker":
            sheet_name = assigned_sheet
        else:
            sheet_name = clean(sheet_name) or "default"
        content = await file.read()
        filename = file.filename.lower()
        if not (filename.endswith(".xlsx") or filename.endswith(".xls") or filename.endswith(".csv")):
            raise HTTPException(status_code=400, detail="Only Excel (.xlsx, .xls) and CSV files are supported.")

        await sheets_collection.update_one(
            {"user_id": uid, "name": sheet_name},
            {"$setOnInsert": {"user_id": uid, "name": sheet_name, "created_at": datetime.utcnow()}},
            upsert=True
        )

        records, columns, vehicle_col = services.parse_and_normalize(content, filename, sheet_name)
        if not records:
            return {"message": "No valid vehicle data found.", "count": 0, "columns": columns,
                    "vehicle_col": vehicle_col, "inserted": 0, "updated": 0, "total_processed": 0}

        inserted_count = 0
        updated_count = 0
        for record in records:
            record["user_id"] = uid
            result = await vehicles_collection.update_one(
                {"user_id": uid, "vehicle_number": record["vehicle_number"], "sheet_name": sheet_name},
                {"$set": record}, upsert=True)
            if result.upserted_id:
                inserted_count += 1
            else:
                updated_count += 1

        await uploads_collection.insert_one({
            "user_id": uid,
            "filename": file.filename, "timestamp": datetime.utcnow(),
            "inserted": inserted_count, "updated": updated_count,
            "columns": FIXED_FIELDS, "vehicle_col": VEHICLE_FIELD,
            "sheet_name": sheet_name,
        })

        return {"message": "File processed successfully", "inserted": inserted_count,
                "updated": updated_count, "total_processed": len(records),
                "columns": FIXED_FIELDS, "vehicle_col": VEHICLE_FIELD, "sheet_name": sheet_name}

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")


# ─────────────────────────────────────────────────────────────
# Vehicles CRUD (user-scoped)
# ─────────────────────────────────────────────────────────────

@router.get("/search/{vehicle_number}")
async def search_vehicle(vehicle_number: str, sheet: Optional[str] = Query(None),
                         current_user: Dict = Depends(get_current_user)):
    uid = current_user["id"]
    role = current_user.get("role", "worker")
    assigned_sheet = current_user.get("assigned_sheet", "default")

    v_num = vehicle_number.replace(" ", "").upper().strip()
    query: Dict[str, Any] = {"user_id": uid, "vehicle_number": v_num}

    if role == "worker":
        # Workers can only search within their assigned sheet
        query["sheet_name"] = assigned_sheet
    elif sheet:
        query["sheet_name"] = clean(sheet)

    vehicle = await vehicles_collection.find_one(query, {"_id": 0})
    if not vehicle:
        raise HTTPException(status_code=404, detail=f"No record found for vehicle number: {v_num}")
    raw_data = vehicle.get("data", {})
    structured = {field: raw_data.get(field, "") for field in FIXED_FIELDS}
    # Include any extra fields from data that are not in FIXED_FIELDS
    for k, v in raw_data.items():
        if k not in structured:
            structured[k] = v
    return {"vehicle_number": vehicle["vehicle_number"], "sheet_name": vehicle.get("sheet_name", "default"),
            "data": structured}


@router.post("/vehicles")
async def create_or_update_vehicle(payload: Dict[str, Any], current_user: Dict = Depends(get_current_user)):
    uid = current_user["id"]
    role = current_user.get("role", "worker")
    assigned_sheet = current_user.get("assigned_sheet", "default")

    vehicle_number = payload.get("vehicle_number", "").replace(" ", "").upper().strip()
    if not vehicle_number:
        raise HTTPException(status_code=400, detail="vehicle_number is required")

    # Workers can only save to their assigned sheet
    if role == "worker":
        sheet_name = assigned_sheet
    else:
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
    uid = current_user["id"]
    role = current_user.get("role", "worker")
    assigned_sheet = current_user.get("assigned_sheet", "default")

    v_num = vehicle_number.replace(" ", "").upper().strip()
    query: Dict[str, Any] = {"user_id": uid, "vehicle_number": v_num}

    if role == "worker":
        query["sheet_name"] = assigned_sheet
    elif sheet:
        query["sheet_name"] = clean(sheet)

    vehicle = await vehicles_collection.find_one(query, {"_id": 0})
    if not vehicle:
        raise HTTPException(status_code=404, detail=f"No record found for: {v_num}")
    raw_data = vehicle.get("data", {})
    structured = {field: raw_data.get(field, "") for field in FIXED_FIELDS}
    return {"vehicle_number": vehicle["vehicle_number"], "sheet_name": vehicle.get("sheet_name", "default"),
            "data": structured}


@router.get("/vehicles")
async def list_vehicles(page: int = 1, limit: int = 50,
                        sheet: Optional[str] = Query("default"),
                        current_user: Dict = Depends(require_admin)):
    uid = current_user["id"]
    sheet = clean(sheet or "default")
    query: Dict[str, Any] = {"user_id": uid, "sheet_name": sheet}
    skip = (page - 1) * limit
    cursor = vehicles_collection.find(query, {"_id": 0}).skip(skip).limit(limit)
    vehicles = await cursor.to_list(length=limit)
    total = await vehicles_collection.count_documents(query)
    return {"vehicles": vehicles, "total": total, "page": page, "limit": limit, "sheet_name": sheet}


# ─────────────────────────────────────────────────────────────
# Dashboard Stats (admin only)
# ─────────────────────────────────────────────────────────────

@router.get("/dashboard/stats")
async def get_dashboard_stats(sheet: Optional[str] = Query("default"),
                              current_user: Dict = Depends(get_current_user)):
    uid = current_user["id"]
    role = current_user.get("role", "worker")
    assigned_sheet = current_user.get("assigned_sheet", "default")
    # Workers always see their assigned sheet only
    if role == "worker":
        sheet = assigned_sheet
    else:
        sheet = clean(sheet or "default")
    base_query: Dict[str, Any] = {"user_id": uid, "sheet_name": sheet}

    total_vehicles = await vehicles_collection.count_documents(base_query)
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    seven_days_later  = today + timedelta(days=7)
    thirty_days_later = today + timedelta(days=30)

    cursor = vehicles_collection.find(base_query, {"_id": 0, "vehicle_number": 1, "data": 1})
    all_vehicles = await cursor.to_list(length=50000)

    active_count = expired_count = no_insurance_count = expiring_7 = expiring_30 = 0
    monthly_data: Dict[str, int] = {}
    expiry_by_month: Dict[str, int] = {}
    company_counts: Dict[str, int] = {}
    fuel_counts: Dict[str, int] = {}

    for v in all_vehicles:
        data = v.get("data", {})
        expiry_str = data.get("expiredInsuranceUpto", "")
        expiry_dt = parse_expiry_date(expiry_str)

        if expiry_dt is None:
            no_insurance_count += 1
        elif expiry_dt < today:
            expired_count += 1
        else:
            active_count += 1

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

    uploads_cursor = uploads_collection.find({"user_id": uid, "sheet_name": sheet}, {"_id": 0}).sort("timestamp", 1)
    all_uploads = await uploads_cursor.to_list(length=1000)
    for u in all_uploads:
        if "timestamp" in u:
            mk = u["timestamp"].strftime("%b %Y")
            monthly_data[mk] = monthly_data.get(mk, 0) + u.get("inserted", 0)

    recent_uploads_cursor = uploads_collection.find({"user_id": uid, "sheet_name": sheet}, {"_id": 0}).sort("timestamp", -1).limit(5)
    recent_uploads = await recent_uploads_cursor.to_list(length=5)
    for u in recent_uploads:
        if "timestamp" in u:
            u["timestamp"] = u["timestamp"].isoformat()

    recent_vehicles_cursor = vehicles_collection.find(base_query, {"_id": 0}).sort("_id", -1).limit(10)
    recent_vehicles_list = await recent_vehicles_cursor.to_list(length=10)
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

    sorted_expiry_months  = sorted(expiry_by_month.keys(), key=month_sort_key)[-12:]
    sorted_monthly_keys   = sorted(monthly_data.keys(),    key=month_sort_key)[-12:]

    return {
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


# ─────────────────────────────────────────────────────────────
# Export (admin only)
# ─────────────────────────────────────────────────────────────

@router.get("/export")
async def export_vehicles(sheet: Optional[str] = Query("default"),
                          current_user: Dict = Depends(get_current_user)):
    uid = current_user["id"]
    role = current_user.get("role", "worker")
    assigned_sheet = current_user.get("assigned_sheet", "default")
    if role == "worker":
        sheet = assigned_sheet
    else:
        sheet = clean(sheet or "default")
    cursor = vehicles_collection.find({"user_id": uid, "sheet_name": sheet}, {"_id": 0})
    records = await cursor.to_list(length=10000)
    excel_bytes = services.export_to_excel(records)
    safe_name = sheet.replace(" ", "_").replace("/", "-")
    return StreamingResponse(
        BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={safe_name}_export.xlsx"}
    )


# ─────────────────────────────────────────────────────────────
# Admin — User Management
# ─────────────────────────────────────────────────────────────

@router.get("/admin/users")
async def list_users(current_user: Dict = Depends(require_admin)):
    cursor = users_collection.find({}, {"_id": 1, "username": 1, "role": 1, "assigned_sheet": 1, "created_at": 1})
    users = await cursor.to_list(length=500)
    result = []
    for u in users:
        result.append({
            "id": str(u["_id"]),
            "username": u.get("username", ""),
            "role": u.get("role", "worker"),
            "assigned_sheet": u.get("assigned_sheet", "default"),
            "created_at": u.get("created_at", "").isoformat() if u.get("created_at") else "",
        })
    return {"users": result}


@router.patch("/admin/users/{user_id}")
async def update_user(user_id: str, payload: Dict[str, Any], current_user: Dict = Depends(require_admin)):
    updates: Dict[str, Any] = {}
    if "role" in payload and payload["role"] in ("admin", "worker"):
        updates["role"] = payload["role"]
    if "assigned_sheet" in payload:
        updates["assigned_sheet"] = str(payload["assigned_sheet"]).strip() or "default"
    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update.")
    try:
        result = await users_collection.update_one({"_id": ObjectId(user_id)}, {"$set": updates})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID.")
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found.")
    return {"message": "User updated.", "updates": updates}
