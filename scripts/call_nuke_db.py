import os
import requests

# URL of the danger-nuke-db endpoint (adjust if using a different environment)
API_URL = os.getenv("API_URL", "https://smart-vehicle-data-management-system.onrender.com/api/auth/danger-nuke-db")

# Hardcoded secret key defined in the backend endpoint
SECRET = os.getenv("DB_RESET_SECRET", "smartinsure-dangerous-nuke-db-secret-key-12345")

payload = {"secret": SECRET}

try:
    response = requests.post(API_URL, json=payload, timeout=10)
    response.raise_for_status()
    print("✅ Database reset successful:")
    print(response.json())
except Exception as e:
    print(f"❌ Failed to reset database: {e}")
