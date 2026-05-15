import asyncio
import os
from datetime import datetime
import traceback
from pymongo import MongoClient

from worker import celery_app
import services
from services import FIXED_FIELDS, VEHICLE_FIELD

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
sync_client = MongoClient(MONGO_URI)
database = sync_client.vehicle_insurance
vehicles_sync = database.get_collection("vehicles")
sheets_sync = database.get_collection("sheets")
uploads_sync = database.get_collection("uploads")
upload_tasks_sync = database.get_collection("upload_tasks")
export_tasks_sync = database.get_collection("export_tasks")

@celery_app.task(bind=True)
def process_upload_task(self, filepath: str, filename: str, sheet_name: str, uid: str):
    task_id = self.request.id
    try:
        # Mark as processing
        upload_tasks_sync.update_one(
            {"task_id": task_id},
            {"$set": {"status": "processing", "started_at": datetime.utcnow()}},
            upsert=True
        )

        with open(filepath, "rb") as f:
            content = f.bytes() if hasattr(f, 'bytes') else f.read()

        # services.parse_and_normalize uses Motor for persist async, so we'll run it in an event loop
        # Actually parse_and_normalize is purely synchronous and it calls _schedule_persist as fire-and-forget.
        # But `_schedule_persist` checks if loop is running, if not it just passes. So it won't crash.
        records, columns, vehicle_col = services.parse_and_normalize(
            content, filename, sheet_name, user_id=uid
        )

        if not records:
            upload_tasks_sync.update_one(
                {"task_id": task_id},
                {"$set": {"status": "completed", "total_processed": 0, "inserted": 0, "updated": 0, "message": "No valid data found"}}
            )
            # Cleanup
            if os.path.exists(filepath):
                os.remove(filepath)
            return {"status": "completed", "total": 0}

        # Dynamically create sheets
        unique_sheets = list({r["sheet_name"] for r in records})
        for sname in unique_sheets:
            sheets_sync.update_one(
                {"user_id": uid, "name": sname},
                {"$setOnInsert": {"user_id": uid, "name": sname, "created_at": datetime.utcnow()}},
                upsert=True
            )

        inserted_count = 0
        updated_count = 0
        
        # Batch insert for millions of records
        from pymongo import UpdateOne
        batch = []
        for record in records:
            rec_sheet = record["sheet_name"]
            record["user_id"] = uid
            batch.append(
                UpdateOne(
                    {"user_id": uid, "vehicle_number": record["vehicle_number"], "sheet_name": rec_sheet},
                    {"$set": record},
                    upsert=True
                )
            )
            
            # Flush batch every 10,000 to save memory footprint and guarantee performance
            if len(batch) >= 10000:
                res = vehicles_sync.bulk_write(batch)
                inserted_count += res.upserted_count
                updated_count += res.modified_count
                batch = []

        if batch:
            res = vehicles_sync.bulk_write(batch)
            inserted_count += res.upserted_count
            updated_count += res.modified_count

        primary_sheet = unique_sheets[0] if unique_sheets else sheet_name
        uploads_sync.insert_one({
            "user_id": uid, "filename": filename, "timestamp": datetime.utcnow(),
            "inserted": inserted_count, "updated": updated_count,
            "columns": FIXED_FIELDS, "vehicle_col": VEHICLE_FIELD, "sheet_name": primary_sheet,
        })
        
        upload_tasks_sync.update_one(
            {"task_id": task_id},
            {"$set": {
                "status": "completed",
                "inserted": inserted_count,
                "updated": updated_count,
                "total_processed": len(records),
                "message": "File processed successfully",
                "completed_at": datetime.utcnow()
            }}
        )

        # Cleanup
        if os.path.exists(filepath):
            os.remove(filepath)

        return {"status": "completed"}
    
    except Exception as e:
        err = str(e)
        upload_tasks_sync.update_one(
            {"task_id": task_id},
            {"$set": {"status": "failed", "error": err, "failed_at": datetime.utcnow()}}
        )
        if os.path.exists(filepath):
            os.remove(filepath)
        raise e


@celery_app.task(bind=True)
def process_export_task(self, sheet: str, uid: str):
    task_id = self.request.id
    try:
        export_tasks_sync.update_one(
            {"task_id": task_id},
            {"$set": {"status": "processing", "started_at": datetime.utcnow()}},
            upsert=True
        )
        records = list(vehicles_sync.find({"user_id": uid, "sheet_name": sheet}, {"_id": 0}))
        excel_bytes = services.export_to_excel(records)
        os.makedirs("exports_temp", exist_ok=True)
        filepath = os.path.join("exports_temp", f"{task_id}.xlsx")
        with open(filepath, "wb") as f:
            f.write(excel_bytes)
        export_tasks_sync.update_one(
            {"task_id": task_id},
            {"$set": {"status": "completed", "total": len(records), "completed_at": datetime.utcnow()}}
        )
        return {"status": "completed", "total": len(records)}
    except Exception as e:
        export_tasks_sync.update_one(
            {"task_id": task_id},
            {"$set": {"status": "failed", "error": str(e), "failed_at": datetime.utcnow()}}
        )
        raise e
