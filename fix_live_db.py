"""
SmartInsure — Live DB Fix Script
=================================
This script connects to your live Render backend API and:
  1. Logs in with admin credentials
  2. Runs Diagnose (shows current DB state)
  3. Runs Fix Vehicle Numbers (repairs records with empty vehicle_number)
  4. If no records found → guides you to re-upload the file

Run this from PowerShell:
    pip install requests
    python fix_live_db.py
"""

import sys
import json

try:
    import requests
except ImportError:
    print("Installing requests...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests", "-q"])
    import requests

API = "https://smart-vehicle-data-management-system.onrender.com/api"

# ─── Step 1: Login ────────────────────────────────────────────────────────────
print("\n" + "="*60)
print("  SmartInsure Live DB Fix Tool")
print("="*60)

print("\nEnter your ADMIN credentials:")
email    = input("  Email/Username: ").strip()
password = input("  Password: ").strip()

print("\n[1/3] Logging in...")
r = requests.post(f"{API}/auth/login", json={"username": email, "password": password}, timeout=30)

if r.status_code != 200:
    print(f"\n❌ Login failed: {r.status_code} — {r.text}")
    sys.exit(1)

token = r.json().get("access_token")
if not token:
    print(f"\n❌ No token returned: {r.json()}")
    sys.exit(1)
print("   ✅ Login successful!")

headers = {"Authorization": f"Bearer {token}"}

# ─── Step 2: Diagnose ─────────────────────────────────────────────────────────
print("\n[2/3] Running DB Diagnosis...")
r = requests.get(f"{API}/admin/diagnose", headers=headers, timeout=30)

if r.status_code != 200:
    print(f"\n❌ Diagnose failed: {r.status_code} — {r.text}")
    sys.exit(1)

diag = r.json()
print("\n📊 Diagnosis Result:")
print(f"   Total records : {diag.get('total_records', 0)}")
print(f"   Bad records   : {diag.get('empty_vehicle_number_records', 0)}")
print("\n   Sheets:")
for s in diag.get("sheets", []):
    print(f"   • {s['sheet']}: {s['count']} records")
    print(f"     Sample vehicle_number : {s.get('sample_vn')!r}")
    print(f"     Sample data keys      : {s.get('sample_data_keys', [])[:5]}")

total     = diag.get("total_records", 0)
bad_count = diag.get("empty_vehicle_number_records", 0)

# ─── Step 3: Fix ──────────────────────────────────────────────────────────────
if total == 0:
    print("\n" + "="*60)
    print("  ⚠️  NO RECORDS FOUND IN DATABASE")
    print("="*60)
    print("""
  This means records were never stored because the vehicle column
  could not be detected in the old version of the parser.

  ACTION REQUIRED:
  → Go to the app → Upload Data → Re-upload your Excel file.
  → The new intelligent parser will now correctly detect any
    vehicle column (Reg No, Veh No, RC No, Vehicle No, etc.)
  → After upload, search will work immediately.
""")
elif bad_count > 0:
    print(f"\n[3/3] Found {bad_count} records with empty vehicle_number. Fixing...")
    r = requests.post(f"{API}/admin/migrate/fix-vehicle-numbers", headers=headers, timeout=60)
    if r.status_code == 200:
        result = r.json()
        print("\n✅ Fix Complete:")
        print(f"   Fixed    : {result.get('fixed', 0)}")
        print(f"   Unfixable: {result.get('unfixable', 0)}")
        print(f"   Scanned  : {result.get('total_scanned', 0)}")
        print(f"\n   {result.get('action_needed', '')}")
        if result.get('unfixable', 0) > 0:
            print("\n  For unfixable records → Re-upload the Excel file.")
    else:
        print(f"\n❌ Fix failed: {r.status_code} — {r.text}")
else:
    print(f"\n✅ All {total} records have valid vehicle numbers — data looks good!")
    print("   If search is still failing, check your plate number format.")
    print("   Example: GJ06RC1934 (no spaces, uppercase)")
    
    # Try to search the specific plate
    test_plate = input("\n  Try searching a plate number now? (Enter plate or leave blank): ").strip()
    if test_plate:
        r = requests.get(f"{API}/search/{test_plate}", headers=headers, timeout=15)
        print(f"\n  Search result [{r.status_code}]:")
        print(f"  {json.dumps(r.json(), indent=2)[:500]}")

print("\n" + "="*60)
print("  Done. Refresh your browser and try searching again.")
print("="*60 + "\n")
