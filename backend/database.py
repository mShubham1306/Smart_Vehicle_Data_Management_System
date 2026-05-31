import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

# OPTIMIZED CONNECTION POOLING FOR SCALING
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")

# Pass pool settings as constructor kwargs (safe — no URI string manipulation)
client = AsyncIOMotorClient(
    MONGO_URI,
    maxPoolSize=50,
    minPoolSize=5,
    maxIdleTimeMS=45000,
    serverSelectionTimeoutMS=10000,
    waitQueueTimeoutMS=10000,
)

database = client.vehicle_insurance

vehicles_collection          = database.get_collection("vehicles")
uploads_collection           = database.get_collection("uploads")
schema_collection            = database.get_collection("schemas")
sheets_collection            = database.get_collection("sheets")
users_collection             = database.get_collection("users")
learned_mappings_collection  = database.get_collection("learned_mappings")
upload_tasks_collection      = database.get_collection("upload_tasks")
export_tasks_collection      = database.get_collection("export_tasks")

# ── Enterprise Security Collections ──────────────────────────────────────────
audit_logs_collection        = database.get_collection("audit_logs")
sessions_collection          = database.get_collection("sessions")
revoked_tokens_collection    = database.get_collection("revoked_tokens")
email_queue_collection       = database.get_collection("email_queue")
pdf_documents_collection     = database.get_collection("pdf_documents")
doc_uploads_collection       = database.get_collection("doc_uploads")



async def init_db():
    """Create indexes for fast search and enterprise security. Drop conflicting old indexes."""
    # ── Drop old conflicting vehicle index ─────────────────────────────────── 
    try:
        existing = await vehicles_collection.index_information()
        for idx_name, idx_info in existing.items():
            key_fields = [k for k, _ in idx_info.get("key", [])]
            if key_fields == ["vehicle_number"] and idx_info.get("unique"):
                await vehicles_collection.drop_index(idx_name)
                print(f"[init_db] Dropped conflicting old index: {idx_name}")
    except Exception as e:
        print(f"[init_db] Could not check/drop old index (non-critical): {e}")

    # ── Vehicle Indexes ────────────────────────────────────────────────────── 
    await vehicles_collection.create_index(
        [("user_id", 1), ("vehicle_number", 1), ("sheet_name", 1)],
        unique=True, name="user_vehicle_sheet_idx"
    )
    await vehicles_collection.create_index("vehicle_number")
    await vehicles_collection.create_index("searchable_tokens")
    await vehicles_collection.create_index([("user_id", 1), ("sheet_name", 1)])
    await vehicles_collection.create_index([("user_id", 1), ("vehicle_number", 1)])
    await vehicles_collection.create_index([("data.vehicleInsuranceCompanyName", 1)])
    await vehicles_collection.create_index([("user_id", 1), ("searchable_tokens", 1)])
    await vehicles_collection.create_index([("user_id", 1), ("sheet_name", 1), ("parsed_expiry_date", 1)])
    
    # Text index for Tier 4 emergency searches
    try:
        await vehicles_collection.create_index(
            [("searchable_tokens", "text"), ("data.Vehicle", "text")],
            name="vehicle_data_text_idx"
        )
    except Exception:
        pass  # Already exists

    # ── Uploads / Sheets / Users / PDF Indexes ──────────────────────────────
    await uploads_collection.create_index("timestamp")
    await uploads_collection.create_index("user_id")
    await sheets_collection.create_index([("user_id", 1), ("name", 1)], unique=True)
    await users_collection.create_index("username", unique=True)
    await users_collection.create_index("email", sparse=True)
    await users_collection.create_index("email_verification_token", sparse=True)
    await users_collection.create_index("refresh_token_hash", sparse=True)
    await learned_mappings_collection.create_index(
        [("normalized_header", 1), ("user_id", 1)], unique=True,
        name="learned_mapping_idx"
    )
    
    # PDF tracking indexes
    await pdf_documents_collection.create_index("quote_id", unique=True)
    await pdf_documents_collection.create_index("user_id")
    await pdf_documents_collection.create_index("admin_id")
    await pdf_documents_collection.create_index("vehicle_number")
    await pdf_documents_collection.create_index([("generated_at", -1)])

    # doc_uploads collection indexes
    await doc_uploads_collection.create_index("uploaded_by_user_id")
    await doc_uploads_collection.create_index("ocr_status")
    await doc_uploads_collection.create_index([("upload_time", -1)])
    await doc_uploads_collection.create_index([("uploaded_by_user_id", 1), ("upload_time", -1)])


    # ── Security Collections Indexes ───────────────────────────────────────── 
    # Audit logs — query by user and time
    await audit_logs_collection.create_index([("user_id", 1), ("timestamp", -1)])
    await audit_logs_collection.create_index("timestamp")
    await audit_logs_collection.create_index("action")
    await audit_logs_collection.create_index([("user_id", 1), ("action", 1), ("timestamp", -1)])
    
    # Email queue for fast status queries
    await email_queue_collection.create_index([("status", 1), ("created_at", 1)])
    await email_queue_collection.create_index([("user_id", 1)])
    try:
        await email_queue_collection.create_index(
            "created_at", expireAfterSeconds=604800, name="email_queue_ttl_idx"  # 7 days
        )
    except Exception:
        pass

    # Sessions — fast lookup + auto-expire after 7 days via TTL
    await sessions_collection.create_index([("user_id", 1)])
    await sessions_collection.create_index("jti")
    try:
        await sessions_collection.create_index(
            "expires_at", expireAfterSeconds=0, name="session_ttl_idx"
        )
    except Exception:
        pass

    # Revoked tokens — fast JTI lookup + auto-expire via TTL
    await revoked_tokens_collection.create_index("jti", unique=True)
    try:
        await revoked_tokens_collection.create_index(
            "expires_at", expireAfterSeconds=0, name="revoked_token_ttl_idx"
        )
    except Exception:
        pass

    # ── Migration: Populate parsed_expiry_date for existing vehicles ──────────
    try:
        from services import parse_expiry_date
        from pymongo import UpdateOne
        cursor = vehicles_collection.find({"parsed_expiry_date": {"$exists": False}})
        updates = []
        async for doc in cursor:
            data = doc.get("data", {})
            expiry_str = data.get("expiredInsuranceUpto", "")
            parsed_exp = parse_expiry_date(expiry_str) if expiry_str else None
            updates.append(
                UpdateOne(
                    {"user_id": doc["user_id"], "vehicle_number": doc["vehicle_number"], "sheet_name": doc["sheet_name"]},
                    {"$set": {"parsed_expiry_date": parsed_exp}}
                )
            )
            if len(updates) >= 2000:
                await vehicles_collection.bulk_write(updates)
                updates = []
        if updates:
            await vehicles_collection.bulk_write(updates)
        print("[init_db] Existing records migrated with parsed_expiry_date.")
    except Exception as e:
        print(f"[init_db] Migration failed (non-critical): {e}")

    print("[init_db] All indexes created successfully.")
