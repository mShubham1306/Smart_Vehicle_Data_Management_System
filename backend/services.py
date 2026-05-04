import pandas as pd
import re
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

# Regex pattern for Indian vehicle registration numbers
# Handles: GJ06RC1934, MH12AB1234, DL1C1234, etc.
_PLATE_REGEX = re.compile(
    r'^[A-Z]{2}\s*\d{1,2}\s*[A-Z]{1,3}\s*\d{1,4}$',
    re.IGNORECASE
)

# =============================================================================
# SMART COLUMN DETECTION ENGINE
# =============================================================================
# Each canonical field has scored keyword patterns.
# Scoring: count how many keywords appear in normalized column name.
# Higher score = better match. Longer / more specific keywords score higher.
# =============================================================================
COLUMN_PATTERNS: Dict[str, List[str]] = {

    # ── VEHICLE NUMBER (highest priority, most variants) ──
    "Vehicle": [
        # Most specific multi-word forms first (score higher)
        "vehicle registration number", "vehicle registration no",
        "vehicle reg number", "vehicle reg no",
        "vehicle number",  "vehicle no",  "vehicle no.",
        "registration number", "registration no", "registration no.",
        "reg number", "reg no", "reg no.", "reg.",
        "regd no", "regd number", "regd. no",
        "rto number", "rto no",
        "plate number", "plate no",
        "rc number", "rc no",
        "number plate", "licence plate", "license plate",
        "veh no", "veh. no", "veh no.", "veh number",
        "vehicleno", "regno", "regn no", "regn",
        "registration", "vehicle",
    ],

    # ── Sr. No. ──
    "Sr. No.": ["sr no", "serial no", "s no", "sr.", "sno", "s.no", "serial number", "sr"],

    # ── Engine ──
    "engineNum": ["engine number", "engine no", "eng no", "eng num", "engine"],

    # ── Chassis ──
    "chassisNum": ["chassis number", "chassis no", "ch no", "ch num", "chassis"],

    # ── Owner Name ──
    "ownerName": [
        "owner name", "ownername", "customer name", "insured name",
        "name of insured", "policy holder", "holder name",
        "insured", "owner", "name",
    ],

    # ── Owner Address ──
    "ownerAddress": [
        "owner address", "insured address", "customer address",
        "address", "resident", "residence",
    ],

    # ── Vehicle Make ──
    "vehicleMake": ["vehicle make", "make", "brand"],

    # ── Vehicle Model ──
    "vehicleModel": ["vehicle model", "model variant", "veh model"],

    # ── Vehicle Class ──
    "vehicleClass": ["vehicle class", "class", "type"],

    # ── Fuel Type ──
    "fuelType": ["fuel type", "fuel"],

    # ── Sale Amount ──
    "saleAmount": ["sale amount", "saleamount"],

    # ── Mobile ──
    "ownerMobileNo": [
        "owner mobile no", "owner mobile", "mobile number", "mobile no",
        "phone number", "phone no", "contact number", "contact no",
        "mobile", "phone", "contact",
    ],

    # ── Manufacturer ──
    "vehicleManufacturerName": ["vehicle manufacturer", "manufacturer name", "manufacturer"],

    # ── Model short name ──
    "model": ["model"],

    # ── Insurance Company ──
    "vehicleInsuranceCompanyName": [
        "insurance company name", "insurance company",
        "insurer name", "insurer", "ins company",
        "insurance co", "ins co", "company name",
    ],

    # ── Expiry / Due Date ──
    "expiredInsuranceUpto": [
        "insurance expiry date", "policy expiry date", "expiry date",
        "insurance expiry", "policy expiry", "insurance upto",
        "expired upto", "expiry", "expired", "due date",
        "exp date", "exp dt", "renewal date",
    ],

    # ── Policy Number ──
    "vehicleInsurancePolicyNumber": [
        "policy number", "policy no", "policy no.",
        "insurance policy number", "insurance policy no",
        "policy",
    ],

    # ── Financial Fields ──
    "basicODPremium": [
        "basic od premium", "basic od", "od premium",
        "basic premium", "base premium", "basic",
    ],
    "zeroDepPremium": [
        "zero depreciation premium", "zero dep premium",
        "zero dep", "zero depreciation", "nil dep",
        "zerodep", "zero-dep",
    ],
    "ncb": ["no claim bonus", "no claim", "ncb", "claim bonus"],
    "idv": [
        "insured declared value", "insured value", "declared value", "idv",
    ],
    "netPremium": ["net premium", "net amount", "nt premium", "net"],
    "gstAmount": [
        "gst premium", "gst amount", "gst 18", "gst@18",
        "tax amount", "service tax", "taxes", "gst",
    ],
    "totalPremium": [
        "total premium payable", "total premium", "gross premium",
        "final premium", "total payable", "final amount",
        "total amount", "total", "final",
    ],
}


def normalize_col(col: str) -> str:
    """Normalize a column name for fuzzy matching."""
    s = str(col).strip().lower()
    # Replace separators and punctuation with spaces
    s = re.sub(r'[_\-\./\\]+', ' ', s)
    # Collapse multiple spaces
    s = re.sub(r'\s+', ' ', s)
    return s.strip()


def match_column(col: str) -> str:
    """
    Smart column matcher using keyword-scoring.
    Returns the best canonical field name, or the original col if no match scored > 0.

    Scoring rules:
    - Each keyword match scores = word-count of the keyword (longer = more specific)
    - Best score wins; ties broken by keyword length preference
    """
    normalized = normalize_col(col)
    if not normalized:
        return col.strip()

    best_match: Optional[str] = None
    best_score = 0

    for target, keywords in COLUMN_PATTERNS.items():
        score = 0
        for kw in keywords:
            if kw in normalized:
                score += len(kw.split())
        if score > best_score:
            best_score = score
            best_match = target

    if best_score == 0:
        logger.debug(f"[ColMapper] No pattern match for column: '{col}' (normalized: '{normalized}')")
        return col.strip()

    logger.info(f"[ColMapper] '{col}' → '{best_match}' (score={best_score})")
    return best_match  # type: ignore


def normalize_vehicle_number(value: str) -> str:
    """Normalize a vehicle plate number for storage and lookup."""
    s = str(value).strip()
    # Remove common separators and non-alphanumeric chars (but keep letters/digits)
    s = re.sub(r'[^A-Za-z0-9]', '', s)
    return s.upper()


def _is_plate_value(val: str) -> bool:
    """Return True if val looks like an Indian vehicle registration plate."""
    clean = re.sub(r'\s', '', str(val).strip())
    return bool(_PLATE_REGEX.match(clean))


def _guess_vehicle_column(df: "pd.DataFrame") -> Optional[str]:
    """
    Plate-regex auto-detection fallback.
    If no column was mapped to 'Vehicle', scan all columns and find the one
    where the highest fraction of values match the plate regex.
    Returns the column name that best matches, or None.
    """
    best_col: Optional[str] = None
    best_ratio = 0.0

    for col in df.columns:
        # Skip already-mapped canonical columns
        if col in FIXED_FIELDS and col != col:  # only skip canonical names
            continue
        values = df[col].dropna().astype(str)
        if len(values) == 0:
            continue
        match_count = sum(1 for v in values if _is_plate_value(v))
        ratio = match_count / len(values)
        if ratio > best_ratio and ratio >= 0.3:  # At least 30% look like plates
            best_ratio = ratio
            best_col = col

    if best_col:
        logger.info(f"[ColMapper] Plate-regex fallback: column '{best_col}' looks like vehicle numbers ({best_ratio:.0%} match)")
    return best_col


def _process_dataframe(df: "pd.DataFrame", sheet_name: str) -> List[Dict]:
    """Process a single DataFrame and return records tagged with sheet_name."""
    # Drop fully empty rows / columns
    df = df.dropna(how="all")
    df = df.dropna(axis=1, how="all")

    if df.empty:
        return []

    # Step 1: Map every column through the smart keyword scorer
    df = df.rename(columns=lambda c: match_column(str(c)))

    # Step 2: If no 'Vehicle' column was found after mapping, run plate-regex fallback
    if VEHICLE_FIELD not in df.columns:
        fallback_col = _guess_vehicle_column(df)
        if fallback_col:
            logger.info(f"[ColMapper] Renaming '{fallback_col}' to '{VEHICLE_FIELD}' via plate-regex fallback")
            df = df.rename(columns={fallback_col: VEHICLE_FIELD})
        else:
            logger.warning(f"[Upload] Sheet '{sheet_name}': no vehicle column detected. Columns: {list(df.columns)}")

    records = []
    for _, row in df.iterrows():
        row_dict: Dict[str, str] = {}
        for k, v in row.items():
            key = str(k).strip()
            if not key or key.startswith("Unnamed") or key.lower() in ("nan", "none", ""):
                continue
            row_dict[key] = str(v).strip() if pd.notna(v) else ""

        # Vehicle number is mandatory
        raw_vnum = row_dict.get(VEHICLE_FIELD, "") or row_dict.get("vehicle", "")
        if not raw_vnum or raw_vnum.lower() in ("", "nan", "none", "-"):
            continue

        vnum = normalize_vehicle_number(raw_vnum)
        if not vnum:
            continue

        # Build data: all known fixed fields first, fill blanks
        data: Dict[str, str] = {}
        for field in FIXED_FIELDS:
            val = row_dict.get(field, "")
            if val.lower() in ("nan", "none"):
                val = ""
            data[field] = val

        # Merge firstName / lastName → ownerName if ownerName is missing
        if not data.get("ownerName"):
            fname = row_dict.get("firstName", "").strip()
            lname = row_dict.get("lastName", "").strip()
            if fname or lname:
                data["ownerName"] = f"{fname} {lname}".strip()

        # Preserve ALL extra columns from the file that weren't mapped to canonical fields
        for k, v in row_dict.items():
            if k not in data and k not in ("firstName", "lastName"):
                data[k] = v

        # Ensure the Vehicle field in data carries the normalized plate value
        data[VEHICLE_FIELD] = vnum

        records.append({
            "vehicle_number": vnum,
            "sheet_name": sheet_name,
            "data": data,
        })

    logger.info(f"[Upload] Sheet '{sheet_name}': parsed {len(records)} valid records from {len(df)} rows")
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
