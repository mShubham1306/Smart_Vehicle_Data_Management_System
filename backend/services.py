import pandas as pd
from typing import List, Dict, Any, Tuple, Optional
from io import BytesIO
import logging

logger = logging.getLogger(__name__)

# =============================================================================
# FIXED SCHEMA — canonical fields for all vehicle records
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
    # Financial fields from uploaded sheets
    "basicODPremium",
    "zeroDepPremium",
    "ncb",
    "idv",
    "netPremium",
    "gstAmount",
    "totalPremium",
]

# Main vehicle identifier column
VEHICLE_FIELD = "Vehicle"

# =============================================================================
# SMART COLUMN DETECTION ENGINE
# Each canonical field has a list of keyword patterns.
# Scoring: count how many keywords appear in the normalized column name.
# The field with the highest score wins.
# =============================================================================
COLUMN_PATTERNS: Dict[str, List[str]] = {
    # Vehicle
    "Vehicle": ["vehicle", "reg", "registration", "plate", "veh no", "number plate"],
    # Sr. No.
    "Sr. No.": ["sr", "serial", "s.no", "sno"],
    # Engine
    "engineNum": ["engine", "eng no", "eng num"],
    # Chassis
    "chassisNum": ["chassis", "ch no", "ch num"],
    # Owner Name — keep together first before splitting
    "ownerName": ["owner name", "ownername", "customer name", "insured name", "name of insured", "holder"],
    # Owner Address
    "ownerAddress": ["address", "owner address", "resident"],
    # Vehicle Make
    "vehicleMake": ["vehicle make", "make", "brand", "manufacturer make"],
    # Vehicle Model
    "vehicleModel": ["vehicle model", "model variant", "veh model"],
    # Vehicle Class
    "vehicleClass": ["vehicle class", "class", "type"],
    # Fuel
    "fuelType": ["fuel", "fuel type"],
    # Sale Amount (legacy total premium field)
    "saleAmount": ["sale amount", "saleamount"],
    # Mobile
    "ownerMobileNo": ["mobile", "phone", "contact", "mob no", "owner mobile"],
    # Manufacturer (different from Make)
    "vehicleManufacturerName": ["manufacturer", "vehiclemanufacturer"],
    # Model variant / short name
    "model": ["model"],
    # Insurance company
    "vehicleInsuranceCompanyName": ["insurance company", "insurer", "insurance com", "company name", "ins company", "insurance co"],
    # Expiry / Due date
    "expiredInsuranceUpto": ["expiry", "expired", "due date", "exp date", "policy expiry", "insurance upto"],
    # Policy number
    "vehicleInsurancePolicyNumber": ["policy", "policy no", "policy number"],
    # ---- FINANCIAL FIELDS ----
    "basicODPremium": ["basic premium", "basic od", "basic", "od premium", "base premium"],
    "zeroDepPremium": ["zero dep", "zerodep", "zero depreciation", "nil dep"],
    "ncb": ["ncb", "no claim bonus", "claim bonus"],
    "idv": ["idv", "insured declared value", "insured value", "declared value"],
    "netPremium": ["net premium", "nt premium", "net", "nt"],
    "gstAmount": ["gst premium", "gst amount", "gst", "tax amount", "taxes"],
    "totalPremium": ["total premium", "final premium", "gross premium", "total payable", "final", "total"],
}


def normalize_col(col: str) -> str:
    """Normalize a column name for fuzzy matching."""
    return str(col).strip().lower().replace("_", " ").replace("-", " ").replace(".", " ")


def match_column(col: str) -> str:
    """
    Smart column matcher using keyword-scoring.
    Returns the best canonical field name, or the original col if no match scored > 0.
    Also handles exact/substring matches for older FIXED_FIELDS as a fast-path.
    """
    normalized = normalize_col(col)

    best_match: Optional[str] = None
    best_score = 0

    for target, keywords in COLUMN_PATTERNS.items():
        score = 0
        for kw in keywords:
            if kw in normalized:
                # Prefer longer/more specific keyword matches
                score += len(kw.split())
        if score > best_score:
            best_score = score
            best_match = target

    # If nothing matched, return original column name as-is
    if best_score == 0:
        logger.debug(f"[ColMapper] No pattern match for column: '{col}'")
        return col.strip()

    return best_match  # type: ignore


def normalize_vehicle_number(value: str) -> str:
    """Remove spaces, uppercase the plate number."""
    return str(value).replace(" ", "").replace("-", "").upper().strip()


def _process_dataframe(df: "pd.DataFrame", sheet_name: str) -> List[Dict]:
    """Process a single DataFrame and return records tagged with sheet_name."""
    # Drop fully empty rows / columns
    df = df.dropna(how="all")
    df = df.dropna(axis=1, how="all")

    # Rename columns using the smart matcher
    df = df.rename(columns=lambda c: match_column(str(c)))

    records = []
    for _, row in df.iterrows():
        row_dict: Dict[str, str] = {}
        for k, v in row.items():
            key = str(k).strip()
            if not key or key.startswith("Unnamed") or key.lower() in ("nan", "none", ""):
                continue
            row_dict[key] = str(v).strip() if v is not None else ""

        # Vehicle number is mandatory
        raw_vnum = row_dict.get(VEHICLE_FIELD, "") or row_dict.get("vehicle", "")
        if not raw_vnum or raw_vnum.lower() in ("", "nan", "none", "-"):
            continue

        vnum = normalize_vehicle_number(raw_vnum)
        if not vnum:
            continue

        # Build data: all known fixed + financial fields first, fill blanks
        data: Dict[str, str] = {}
        for field in FIXED_FIELDS:
            val = row_dict.get(field, "")
            # Avoid persisting "nan" strings
            if val.lower() in ("nan", "none"):
                val = ""
            data[field] = val

        # Merge firstName / lastName → ownerName if ownerName is missing
        if not data.get("ownerName"):
            fname = row_dict.get("firstName", "").strip()
            lname = row_dict.get("lastName", "").strip()
            if fname or lname:
                data["ownerName"] = f"{fname} {lname}".strip()

        # Store ALL extra columns from the file that weren't mapped
        for k, v in row_dict.items():
            if k not in data and k not in ("firstName", "lastName"):
                data[k] = v

        records.append({
            "vehicle_number": vnum,
            "sheet_name": sheet_name,
            "data": data,
        })

    return records


def parse_and_normalize(
    file_bytes: bytes,
    filename: str,
    sheet_name: str = "default"
) -> Tuple[List[Dict], List[str], str]:
    """
    Parse an uploaded Excel/CSV file, auto-map columns to canonical schema,
    and return normalized records.

    For Excel files with multiple tabs:
        - Each tab becomes its OWN named sheet (tab_name), 
          completely ignoring the caller-supplied sheet_name.
    For single-tab Excel / CSV:
        - Records are tagged with the caller-supplied sheet_name.

    Returns: (records, fixed_columns_list, vehicle_field_name)
    """
    if filename.endswith(".csv"):
        df = pd.read_csv(BytesIO(file_bytes), dtype=str, keep_default_na=False)
        records = _process_dataframe(df, sheet_name)
        return records, FIXED_FIELDS, VEHICLE_FIELD

    # Excel — always read ALL sheets
    try:
        all_sheets: Dict[str, "pd.DataFrame"] = pd.read_excel(
            BytesIO(file_bytes), sheet_name=None, dtype=str, keep_default_na=False
        )
    except Exception as exc:
        logger.warning(f"[Upload] Multi-sheet read failed ({exc}), falling back to single sheet")
        df = pd.read_excel(BytesIO(file_bytes), dtype=str, keep_default_na=False)
        return _process_dataframe(df, sheet_name), FIXED_FIELDS, VEHICLE_FIELD

    records: List[Dict] = []

    if len(all_sheets) == 1:
        # Single-tab Excel → use caller-supplied sheet name
        tab_df = list(all_sheets.values())[0]
        records = _process_dataframe(tab_df, sheet_name)
    else:
        # Multi-tab Excel: each tab → its own application sheet name
        for tab_name, tab_df in all_sheets.items():
            cleaned_tab = tab_name.strip() or sheet_name
            tab_records = _process_dataframe(tab_df, cleaned_tab)
            records.extend(tab_records)
            logger.info(f"[Upload] Excel tab '{tab_name}' → sheet '{cleaned_tab}': {len(tab_records)} records")

    return records, FIXED_FIELDS, VEHICLE_FIELD


def export_to_excel(records: List[Dict]) -> bytes:
    """Export all vehicle records to an Excel file."""
    rows = []
    for rec in records:
        data = rec.get("data", {})
        row: Dict[str, Any] = {}
        for field in FIXED_FIELDS:
            row[field] = data.get(field, "")
        # Also include any extra columns
        for k, v in data.items():
            if k not in row:
                row[k] = v
        rows.append(row)

    all_cols = list(dict.fromkeys([*FIXED_FIELDS] + [c for r in rows for c in r.keys()]))
    df = pd.DataFrame(rows, columns=all_cols)
    output = BytesIO()
    df.to_excel(output, index=False)
    return output.getvalue()
