import pandas as pd
from typing import List, Dict, Any, Tuple, Optional
from io import BytesIO

# =============================================================================
# FIXED SCHEMA — these are the canonical fields for all vehicle records
# =============================================================================
FIXED_FIELDS = [
    "Sr. No.",
    "Vehicle",
    "engineNum",
    "chassisNum",
    "ownerName",
    "ownerAddress",
    "vehicleMake",
    "vehicleModel",
    "vehicleClass",
    "fuelType",
    "saleAmount",
    "ownerMobileNo",
    "vehicleManufacturerName",
    "model",
    "vehicleInsuranceCompanyName",
    "expiredInsuranceUpto",
    "vehicleInsurancePolicyNumber",
]

# Main vehicle identifier column
VEHICLE_FIELD = "Vehicle"

# Aliases: maps various column name variations → canonical FIXED_FIELDS name
COLUMN_ALIASES: Dict[str, str] = {
    # Vehicle / Registration
    "vehicle": "Vehicle",
    "vehicle number": "Vehicle",
    "vehicle no": "Vehicle",
    "vehicleno": "Vehicle",
    "vehicle_number": "Vehicle",
    "registration": "Vehicle",
    "reg no": "Vehicle",
    "reg_no": "Vehicle",
    "number plate": "Vehicle",
    "numberplate": "Vehicle",
    "plate": "Vehicle",
    "veh no": "Vehicle",
    # Sr No
    "sr. no.": "Sr. No.",
    "sr no": "Sr. No.",
    "sr.no.": "Sr. No.",
    "srno": "Sr. No.",
    "serial no": "Sr. No.",
    "s.no": "Sr. No.",
    "s.no.": "Sr. No.",
    # Owner Name
    "ownername": "ownerName",
    "owner name": "ownerName",
    "owner": "ownerName",
    "name": "ownerName",
    # Owner Address
    "owneraddress": "ownerAddress",
    "owner address": "ownerAddress",
    "address": "ownerAddress",
    # Engine
    "enginenum": "engineNum",
    "engine no": "engineNum",
    "engine number": "engineNum",
    "engine_no": "engineNum",
    # Chassis
    "chassisnum": "chassisNum",
    "chassis no": "chassisNum",
    "chassis number": "chassisNum",
    "chassis_no": "chassisNum",
    # Vehicle Make
    "vehiclemake": "vehicleMake",
    "vehicle make": "vehicleMake",
    "make": "vehicleMake",
    "brand": "vehicleMake",
    # Vehicle Model
    "vehiclemodel": "vehicleModel",
    "vehicle model": "vehicleModel",
    # Vehicle Class
    "vehicleclass": "vehicleClass",
    "vehicle class": "vehicleClass",
    "class": "vehicleClass",
    "type": "vehicleClass",
    # Fuel Type
    "fueltype": "fuelType",
    "fuel type": "fuelType",
    "fuel": "fuelType",
    # Sale Amount
    "saleamount": "saleAmount",
    "sale amount": "saleAmount",
    "amount": "saleAmount",
    "price": "saleAmount",
    # Mobile
    "ownermobileno": "ownerMobileNo",
    "owner mobile no": "ownerMobileNo",
    "mobile": "ownerMobileNo",
    "mobile no": "ownerMobileNo",
    "phone": "ownerMobileNo",
    "contact": "ownerMobileNo",
    # Manufacturer
    "vehiclemanufacturername": "vehicleManufacturerName",
    "manufacturer": "vehicleManufacturerName",
    "vehiclemanufacturer": "vehicleManufacturerName",
    # Model
    "model": "model",
    # Insurance Company
    "vehicleinsurancecompanyname": "vehicleInsuranceCompanyName",
    "insurance company": "vehicleInsuranceCompanyName",
    "insurer": "vehicleInsuranceCompanyName",
    # Insurance Expiry
    "expirdnsuranceupto": "expiredInsuranceUpto",
    "expired insurance upto": "expiredInsuranceUpto",
    "expiredinsuranceupto": "expiredInsuranceUpto",
    "insurance expiry": "expiredInsuranceUpto",
    "expiry": "expiredInsuranceUpto",
    "exp date": "expiredInsuranceUpto",
    # Policy Number
    "vehicleinsurancepolicynumber": "vehicleInsurancePolicyNumber",
    "policy number": "vehicleInsurancePolicyNumber",
    "policy no": "vehicleInsurancePolicyNumber",
    "policy": "vehicleInsurancePolicyNumber",
}


def map_column(col: str) -> str:
    """Map an uploaded file column name to a canonical fixed field name."""
    return COLUMN_ALIASES.get(col.lower().strip(), col.strip())


def normalize_vehicle_number(value: str) -> str:
    """Remove spaces, uppercase the plate number."""
    return str(value).replace(" ", "").upper().strip()


def _process_dataframe(df: "pd.DataFrame", sheet_name: str) -> List[Dict]:
    """Helper: process a single DataFrame and return records tagged with sheet_name."""
    # Drop fully empty rows / columns
    df = df.dropna(how="all")
    df = df.dropna(axis=1, how="all")

    # Rename columns to canonical names
    df = df.rename(columns=lambda c: map_column(str(c)))

    records = []
    for _, row in df.iterrows():
        row_dict = {k: str(v).strip() for k, v in row.items()
                    if k and not str(k).startswith("Unnamed")}

        # Get vehicle number — must exist
        raw_vnum = row_dict.get(VEHICLE_FIELD, "")
        if not raw_vnum or raw_vnum in ("", "nan", "None", "-"):
            continue

        vnum = normalize_vehicle_number(raw_vnum)
        if not vnum:
            continue

        # Build data with all fixed fields (fill missing with "")
        data: Dict[str, str] = {}
        for field in FIXED_FIELDS:
            data[field] = row_dict.get(field, "")

        # Also store any extra columns from the file not in fixed schema
        for k, v in row_dict.items():
            if k not in data:
                data[k] = v

        records.append({
            "vehicle_number": vnum,
            "sheet_name": sheet_name,
            "data": data,
        })
    return records


def parse_and_normalize(file_bytes: bytes, filename: str, sheet_name: str = "default") -> Tuple[List[Dict], List[str], str]:
    """
    Parse an uploaded Excel/CSV file, map columns to fixed schema,
    and return normalized records tagged with sheet_name.

    For Excel files with multiple tabs, each tab is processed separately.
    Records from each tab get tagged as:
      - single-sheet file  → sheet_name (the target app sheet)
      - multi-sheet file   → sheet_name  (all tabs merged into target sheet)
        but also individually available via tab_sheets if needed.

    Returns: (records, fixed_columns_list, vehicle_field_name)
    """
    if filename.endswith(".csv"):
        df = pd.read_csv(BytesIO(file_bytes), dtype=str, keep_default_na=False)
        return _process_dataframe(df, sheet_name), FIXED_FIELDS, VEHICLE_FIELD

    # Excel — read ALL sheets
    try:
        all_sheets: Dict[str, "pd.DataFrame"] = pd.read_excel(
            BytesIO(file_bytes), sheet_name=None, dtype=str, keep_default_na=False
        )
    except Exception:
        # Fallback: try reading as single sheet
        df = pd.read_excel(BytesIO(file_bytes), dtype=str, keep_default_na=False)
        return _process_dataframe(df, sheet_name), FIXED_FIELDS, VEHICLE_FIELD

    records: List[Dict] = []
    for tab_name, df in all_sheets.items():
        tab_records = _process_dataframe(df, sheet_name)
        records.extend(tab_records)

    return records, FIXED_FIELDS, VEHICLE_FIELD


def export_to_excel(records: List[Dict]) -> bytes:
    """Export all vehicle records to an Excel file using the fixed schema columns."""
    rows = []
    for rec in records:
        row: Dict[str, Any] = {}
        data = rec.get("data", {})
        for field in FIXED_FIELDS:
            row[field] = data.get(field, "")
        rows.append(row)
    df = pd.DataFrame(rows, columns=FIXED_FIELDS)
    output = BytesIO()
    df.to_excel(output, index=False)
    return output.getvalue()
