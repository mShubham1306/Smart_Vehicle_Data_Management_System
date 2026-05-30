import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def clear_db():
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    client = AsyncIOMotorClient(mongo_uri)
    db = client.vehicle_insurance
    collections = [
        "users",
        "vehicles",
        "uploads",
        "sheets",
        "learned_mappings",
        "sessions",
        "audit_logs",
        "revoked_tokens",
        "email_queue",
        "pdf_documents",
        "export_tasks",
        "upload_tasks",
    ]
    for name in collections:
        await db.get_collection(name).delete_many({})
        print(f"Cleared collection: {name}")
    client.close()
    print("Database cleared successfully.")

if __name__ == "__main__":
    asyncio.run(clear_db())
