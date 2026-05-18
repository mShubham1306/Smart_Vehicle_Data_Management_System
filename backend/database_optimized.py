"""
Database Optimization Module
Ready to copy into your backend/database_optimized.py
"""

import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")

# OPTIMIZED CONNECTION POOLING
if "?" not in MONGO_URI:
    MONGO_URI += "?maxPoolSize=500&minPoolSize=50&maxIdleTimeMS=45000&serverSelectionTimeoutMS=10000"
    
client = AsyncIOMotorClient(MONGO_URI)
database = client.vehicle_insurance

# Collections
vehicles_collection          = database.get_collection("vehicles")
uploads_collection           = database.get_collection("uploads")
schema_collection            = database.get_collection("schemas")
sheets_collection            = database.get_collection("sheets")
users_collection             = database.get_collection("users")
learned_mappings_collection  = database.get_collection("learned_mappings")
upload_tasks_collection      = database.get_collection("upload_tasks")
export_tasks_collection      = database.get_collection("export_tasks")
audit_logs_collection        = database.get_collection("audit_logs")
sessions_collection          = database.get_collection("sessions")
revoked_tokens_collection    = database.get_collection("revoked_tokens")
email_queue_collection       = database.get_collection("email_queue")


async def init_db():
    """Initialize database with optimized indexes"""
    print("🔧 Initializing database with performance indexes...")
    
    try:
        # Drop conflicting old indexes
        existing = await vehicles_collection.index_information()
        for idx_name, idx_info in existing.items():
            key_fields = [k for k, _ in idx_info.get("key", [])]
            if key_fields == ["vehicle_number"] and idx_info.get("unique"):
                try:
                    await vehicles_collection.drop_index(idx_name)
                    print(f"  ✓ Dropped conflicting index: {idx_name}")
                except:
                    pass
    except Exception as e:
        print(f"  ℹ Index cleanup skipped: {e}")

    # ===== USER INDEXES (Authentication critical path) =====
    print("  📌 Creating user indexes...")
    await users_collection.create_index([("email", 1)], unique=True, sparse=True)
    await users_collection.create_index([("phone", 1)], sparse=True)
    await users_collection.create_index([("status", 1), ("created_at", -1)])

    # ===== VEHICLE INDEXES (Most frequently queried) =====
    print("  📌 Creating vehicle indexes...")
    
    # Composite index for user filtering + time sorting
    await vehicles_collection.create_index([("user_id", 1), ("created_at", -1)])
    
    # Exact vehicle lookups
    await vehicles_collection.create_index([("vehicle_number", 1)], sparse=True)
    
    # Sheet-based queries
    await vehicles_collection.create_index([("sheet_name", 1)])
    
    # Complex filters
    await vehicles_collection.create_index([("user_id", 1), ("vehicle_number", 1), ("sheet_name", 1)], unique=True)
    
    # Search optimization
    await vehicles_collection.create_index([("searchable_tokens", 1)])
    
    # Status tracking
    await vehicles_collection.create_index([("insurance_status", 1), ("expiry_date", 1)])

    # ===== UPLOAD & TASK INDEXES =====
    print("  📌 Creating upload/task indexes...")
    await uploads_collection.create_index([("user_id", 1), ("created_at", -1)])
    await uploads_collection.create_index([("status", 1)])
    
    await upload_tasks_collection.create_index([("user_id", 1), ("status", 1)])
    await upload_tasks_collection.create_index([("created_at", 1)], expireAfterSeconds=86400)  # Auto-delete after 1 day
    
    await export_tasks_collection.create_index([("user_id", 1), ("created_at", -1)])

    # ===== AUDIT & SECURITY INDEXES =====
    print("  📌 Creating audit/security indexes...")
    
    # Fast audit log queries
    await audit_logs_collection.create_index([("user_id", 1), ("timestamp", -1)])
    await audit_logs_collection.create_index([("action", 1), ("timestamp", -1)])
    
    # TTL indexes for automatic cleanup
    await revoked_tokens_collection.create_index([("expires_at", 1)], expireAfterSeconds=0)
    await sessions_collection.create_index([("expires_at", 1)], expireAfterSeconds=0)
    
    # Security: detect suspicious activity
    await audit_logs_collection.create_index([("user_id", 1), ("action", 1), ("timestamp", -1)])

    # ===== EMAIL QUEUE INDEXES =====
    print("  📌 Creating email queue indexes...")
    await email_queue_collection.create_index([("status", 1), ("created_at", 1)])
    await email_queue_collection.create_index([("user_id", 1)])
    await email_queue_collection.create_index([("created_at", 1)], expireAfterSeconds=604800)  # Auto-delete after 7 days

    # ===== SHEETS INDEXES =====
    print("  📌 Creating sheets indexes...")
    await sheets_collection.create_index([("user_id", 1)])
    await sheets_collection.create_index([("name", 1)])

    print("✅ Database initialization complete!")


# Performance Analytics
async def get_index_stats():
    """Get index statistics for performance tuning"""
    stats = {}
    
    for collection_name in ["vehicles", "users", "audit_logs", "uploads"]:
        collection = database.get_collection(collection_name)
        indexes = await collection.index_information()
        stats[collection_name] = {
            "index_count": len(indexes),
            "indexes": list(indexes.keys())
        }
    
    return stats


async def analyze_query_performance():
    """Log slow queries for optimization"""
    # Enable profiling
    await database.set_profiling_level(1, slow_ms=100)  # Log queries >100ms
    
    # Get slow queries
    profile_collection = database.system.profile
    slow_queries = await profile_collection.find({
        "millis": {"$gt": 100}
    }).to_list(10)
    
    return slow_queries
