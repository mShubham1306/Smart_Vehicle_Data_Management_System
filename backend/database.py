import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")

client = AsyncIOMotorClient(MONGO_URI)
database = client.vehicle_insurance

vehicles_collection  = database.get_collection("vehicles")
uploads_collection   = database.get_collection("uploads")
schema_collection    = database.get_collection("schemas")
sheets_collection    = database.get_collection("sheets")
users_collection     = database.get_collection("users")


async def init_db():
    """Create indexes for fast search. Drop any old conflicting indexes first."""
    # Drop old single-field unique index (conflicted with multi-user/multi-sheet)
    try:
        existing = await vehicles_collection.index_information()
        for idx_name, idx_info in existing.items():
            key_fields = [k for k, _ in idx_info.get("key", [])]
            # Drop if it's a unique index on ONLY vehicle_number (old schema)
            if key_fields == ["vehicle_number"] and idx_info.get("unique"):
                await vehicles_collection.drop_index(idx_name)
                print(f"[init_db] Dropped conflicting old index: {idx_name}")
    except Exception as e:
        print(f"[init_db] Could not check/drop old index (non-critical): {e}")

    # Vehicles: unique per (user_id + vehicle_number + sheet_name)
    await vehicles_collection.create_index(
        [("user_id", 1), ("vehicle_number", 1), ("sheet_name", 1)],
        unique=True, name="user_vehicle_sheet_idx"
    )
    await vehicles_collection.create_index("vehicle_number")
    await uploads_collection.create_index("timestamp")
    await uploads_collection.create_index("user_id")
    await sheets_collection.create_index([("user_id", 1), ("name", 1)], unique=True)
    await users_collection.create_index("username", unique=True)
