"""
Universal Header Intelligence Engine
=====================================
5-Layer Detection Pipeline:
  1. Smart Header Row Finder      → Auto-detect which row is the actual header
  2. Header Normaliser            → Strip symbols, spaces, duplicates, merged cells
  3. Schema Map Engine (3-tier)   → Keyword score → fuzzy match → learned memory
  4. Data-Pattern Classifier      → Detect field type from value patterns
  5. Self-Learning Memory         → Persist header→canonical mappings in MongoDB
"""

import re
import asyncio
import pandas as pd
import logging
from typing import List, Dict, Any, Optional, Tuple
from io import BytesIO
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# CANONICAL SCHEMA DEFINITION
# ─────────────────────────────────────────────────────────────────────────────

FIXED_FIELDS = [
    "Sr. No.", "Vehicle", "engineNum", "chassisNum", "ownerName",
    "ownerAddress", "vehicleMake", "vehicleModel", "vehicleClass",
    "fuelType", "saleAmount", "ownerMobileNo", "vehicleManufacturerName",
    "model", "vehicleInsuranceCompanyName", "expiredInsuranceUpto",
    "vehicleInsurancePolicyNumber", "basicODPremium", "zeroDepPremium",
    "ncb", "idv", "netPremium", "gstAmount", "totalPremium",
]
VEHICLE_FIELD = "Vehicle"

# ─────────────────────────────────────────────────────────────────────────────
# LAYER 3: SCHEMA MAP ENGINE — keyword scoring patterns (80+ variants)
# ─────────────────────────────────────────────────────────────────────────────
# Each canonical field maps to a list of lowercase phrase patterns.
# Score = sum of (word-count of matched keyword). Longer match = higher score.

COLUMN_PATTERNS: Dict[str, List[str]] = {

    "Vehicle": [
        # Formal
        "vehicle registration number", "vehicle registration no",
        "vehicle reg number", "vehicle reg no",
        "vehicle number", "vehicle no", "vehicle no.",
        "registration number", "registration no", "registration no.",
        "reg number", "reg no", "reg no.", "reg.",
        "regd no", "regd number", "regd. no",
        "rto number", "rto no",
        "plate number", "plate no", "number plate",
        "licence plate", "license plate",
        "rc number", "rc no",
        "veh no", "veh. no", "veh no.", "veh number",
        # Abbreviations
        "vehicleno", "regno", "regn no", "regn", "rcno",
        # Typos
        "vehical no", "vehical number", "vehill no", "vehcile no",
        "regestration no", "registartion no",
        # Short
        "v no", "r no",
        # Hindi
        "gaadi number", "gadi number", "gaadi no", "vahaan number",
        "gaadi sankhya",
        # Gujarati
        "vahan number", "vahan no",
        # Generic fallback
        "vehicle", "registration",
    ],

    "Sr. No.": [
        "serial number", "serial no", "sr no", "sr. no", "sno", "s.no",
        "sequence no", "index", "row no", "s no", "sr",
    ],

    "engineNum": [
        "engine number", "engine no", "eng no", "eng num",
        "engine serial", "motor number", "engine",
    ],

    "chassisNum": [
        "chassis number", "chassis no", "ch no", "ch num",
        "vin number", "vin no", "frame number", "chassis",
    ],

    "ownerName": [
        "owner name", "ownername", "customer name", "client name",
        "insured name", "name of insured", "policy holder name",
        "policy holder", "holder name", "insured person",
        "full name", "applicant name", "customer",
        "insured", "owner", "name", "client",
        # Hindi
        "malik ka naam", "swami ka naam",
    ],

    "ownerAddress": [
        "owner address", "insured address", "customer address",
        "registered address", "correspondence address",
        "address", "resident", "residence", "addr",
    ],

    "vehicleMake": ["vehicle make", "make of vehicle", "brand", "make"],

    "vehicleModel": [
        "vehicle model", "model of vehicle", "model variant",
        "veh model", "car model", "bike model",
    ],

    "vehicleClass": [
        "vehicle class", "vehicle type", "type of vehicle",
        "class", "category", "vehicle category",
    ],

    "fuelType": ["fuel type", "type of fuel", "fuel", "energy type"],

    "saleAmount": ["sale amount", "selling price", "sale price", "saleamount"],

    "ownerMobileNo": [
        "owner mobile no", "owner mobile", "mobile number", "mobile no",
        "phone number", "phone no", "contact number", "contact no",
        "cell number", "cell no", "whatsapp no",
        "mobile", "phone", "contact", "mob", "ph",
        # Hindi
        "mobile sankhya", "phone sankhya",
    ],

    "vehicleManufacturerName": [
        "vehicle manufacturer", "manufacturer name", "manufacturer",
        "oem", "make company",
    ],

    "model": ["model name", "model"],

    "vehicleInsuranceCompanyName": [
        "insurance company name", "insurance company",
        "insurance company nm",
        "insurer name", "insurer", "ins company",
        "insurance co", "ins co", "company name",
        "tpa name", "underwriter",
    ],

    "expiredInsuranceUpto": [
        "insurance expiry date", "policy expiry date", "policy expiry",
        "expiry date", "insurance expiry", "insurance upto",
        "expired upto", "expiry", "expired",
        "due date", "renewal date", "valid upto", "valid till",
        "exp date", "exp dt", "expdt", "expiry dt",
    ],

    "vehicleInsurancePolicyNumber": [
        "policy number", "policy no", "policy no.",
        "insurance policy number", "insurance policy no",
        "policy id", "policy ref", "certificate number",
        "certificate no", "policy",
    ],

    "basicODPremium": [
        "basic od premium", "basic od", "od premium",
        "basic premium", "base premium", "basic",
    ],

    "zeroDepPremium": [
        "zero depreciation premium", "zero dep premium", "zero dep",
        "zero depreciation", "nil dep", "zerodep", "zero-dep",
        "nil depreciation",
    ],

    "ncb": ["no claim bonus", "no claim", "ncb", "claim bonus", "no claim discount"],

    "idv": [
        "insured declared value", "insured declared",
        "insured value", "declared value", "idv",
    ],

    "netPremium": [
        "net premium", "net amount", "nt premium",
        "premium before tax", "base amount", "net",
    ],

    "gstAmount": [
        "gst premium", "gst amount", "gst 18", "gst@18",
        "tax amount", "service tax", "cgst", "sgst", "igst",
        "taxes", "gst",
    ],

    "totalPremium": [
        "total premium payable", "total premium", "gross premium",
        "final premium", "total payable", "final amount",
        "total amount", "gross amount", "total", "final",
        "amount payable", "premium amount",
    ],
}


# ─────────────────────────────────────────────────────────────────────────────
# LAYER 2: HEADER NORMALISER
# ─────────────────────────────────────────────────────────────────────────────

def normalize_col(col: str) -> str:
    """Normalize a column name for scoring and matching."""
    s = str(col).strip().lower()
    # Remove common punctuation/symbols
    s = re.sub(r'[_\-\./\\:;,()\[\]#@!*]+', ' ', s)
    # Collapse multiple spaces
    s = re.sub(r'\s+', ' ', s)
    return s.strip()


def normalize_header_key(col: str) -> str:
    """Ultra-normalized key for learned-mapping dictionary lookups (no separators, lowercase)."""
    s = normalize_col(col)
    return re.sub(r'\s+', '', s)  # remove ALL spaces → single compact string


# ─────────────────────────────────────────────────────────────────────────────
# LAYER 4: DATA-PATTERN CLASSIFIER
# Value-level regex patterns to classify columns even if header is unknown.
# ─────────────────────────────────────────────────────────────────────────────

_PLATE_RE = re.compile(r'^[A-Z]{2}\s*\d{1,2}\s*[A-Z]{1,3}\s*\d{1,4}$', re.IGNORECASE)
_MOBILE_RE = re.compile(r'^[6-9]\d{9}$')
_DATE_RE = re.compile(
    r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})|(\d{4}[/-]\d{1,2}[/-]\d{1,2})'
)
_POLICY_RE = re.compile(r'^[A-Z0-9]{3,}[\-/][A-Z0-9\-/]{5,}$', re.IGNORECASE)
_ENGINE_RE = re.compile(r'^[A-Z0-9]{8,}$', re.IGNORECASE)

def _clean_val(v: Any) -> str:
    s = str(v).strip()
    return '' if s.lower() in ('nan', 'none', '', '-') else s


def _classify_column_by_values(series: pd.Series) -> Optional[str]:
    """
    Scan column values and return the most likely canonical field name.
    Returns None if no confident classification can be made.
    """
    values = [_clean_val(v) for v in series.dropna() if _clean_val(v)]
    if len(values) < 2:
        return None

    n = len(values)
    counts: Dict[str, int] = {k: 0 for k in [
        'Vehicle', 'ownerMobileNo', 'expiredInsuranceUpto',
        'vehicleInsurancePolicyNumber', 'engineNum', 'chassisNum',
    ]}

    for v in values:
        clean = re.sub(r'\s', '', v)
        if _PLATE_RE.match(clean):
            counts['Vehicle'] += 1
        if _MOBILE_RE.match(clean):
            counts['ownerMobileNo'] += 1
        if _DATE_RE.search(v):
            counts['expiredInsuranceUpto'] += 1
        if _POLICY_RE.match(clean) and not _PLATE_RE.match(clean):
            counts['vehicleInsurancePolicyNumber'] += 1
        if _ENGINE_RE.match(clean) and len(clean) >= 9 and len(clean) <= 12:
            counts['engineNum'] += 1
        if _ENGINE_RE.match(clean) and len(clean) >= 13:
            counts['chassisNum'] += 1

    # Require ≥40% confidence for classification
    threshold = max(2, int(n * 0.40))
    best = max(counts, key=lambda k: counts[k])
    if counts[best] >= threshold:
        return best
    return None


# ─────────────────────────────────────────────────────────────────────────────
# LAYER 1: SMART HEADER ROW FINDER
# ─────────────────────────────────────────────────────────────────────────────

# All known header-like keywords (flat list for header-row scoring)
_ALL_HEADER_KEYWORDS = set()
for patterns in COLUMN_PATTERNS.values():
    for p in patterns:
        for word in p.split():
            if len(word) > 2:
                _ALL_HEADER_KEYWORDS.add(word)


def find_header_row(df_raw: pd.DataFrame) -> int:
    """
    Scan the first 25 rows and pick the best header row.
    Returns the 0-based row index of the best header.

    Scoring per row:
    - +3 for each cell that exactly matches a known header keyword
    - +1 for each cell that is a string (not a number/date)
    - Penalise rows with < 3 non-null cells (likely blank/title rows)
    """
    max_scan = min(25, len(df_raw))
    best_row = 0
    best_score = -1

    for i in range(max_scan):
        row = df_raw.iloc[i]
        non_null = [str(v).strip() for v in row if str(v).strip().lower() not in ('nan', 'none', '')]
        if len(non_null) < 3:
            continue  # Skip sparse rows

        score = 0
        for cell in non_null:
            norm = normalize_col(cell)
            # +3 for known keyword match
            for kw in _ALL_HEADER_KEYWORDS:
                if kw in norm:
                    score += 3
                    break
            # +1 for being a text-like value (not a pure number, not a date, not a plate)
            if re.match(r'^[a-zA-Z\s\.\-/]+$', cell):
                score += 1

        if score > best_score:
            best_score = score
            best_row = i

    logger.info(f"[HeaderFinder] Detected header at row {best_row} (score={best_score})")
    return best_row


# ─────────────────────────────────────────────────────────────────────────────
# LAYER 3 TIER 1: KEYWORD SCORING
# ─────────────────────────────────────────────────────────────────────────────

def _keyword_score(normalized: str) -> Tuple[Optional[str], int]:
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
    return best_match, best_score


# ─────────────────────────────────────────────────────────────────────────────
# LAYER 3 TIER 2: FUZZY MATCHING
# ─────────────────────────────────────────────────────────────────────────────

_FUZZY_AVAILABLE = False
try:
    from rapidfuzz import fuzz as _rfuzz
    _FUZZY_AVAILABLE = True
    logger.info("[ColMapper] rapidfuzz available — fuzzy matching ENABLED")
except ImportError:
    logger.warning("[ColMapper] rapidfuzz not installed — fuzzy matching DISABLED")


# Pre-compute flat list of (keyword, canonical_field) for fuzzy search
_FUZZY_CANDIDATES: List[Tuple[str, str]] = []
for _target, _keywords in COLUMN_PATTERNS.items():
    for _kw in _keywords:
        _FUZZY_CANDIDATES.append((_kw, _target))


def _fuzzy_score(normalized: str) -> Tuple[Optional[str], int]:
    if not _FUZZY_AVAILABLE or not normalized:
        return None, 0
    best_match: Optional[str] = None
    best_score = 0
    for kw, target in _FUZZY_CANDIDATES:
        score = _rfuzz.token_sort_ratio(normalized, kw)
        if score > best_score:
            best_score = score
            best_match = target
    return best_match, best_score


# ─────────────────────────────────────────────────────────────────────────────
# LAYER 3 TIER 3: LEARNED MAPPING CACHE (populated from MongoDB at startup)
# ─────────────────────────────────────────────────────────────────────────────

# In-memory cache: {normalized_key → canonical_field}
_learned_cache: Dict[str, str] = {}


def get_learned_mapping(header_key: str) -> Optional[str]:
    return _learned_cache.get(header_key)


def update_learned_cache(header_key: str, canonical: str) -> None:
    _learned_cache[header_key] = canonical


def load_learned_cache_from_db(mappings: List[Dict]) -> None:
    """Called at app startup. Loads all known mappings into memory."""
    for m in mappings:
        k = m.get("normalized_header", "")
        v = m.get("canonical_field", "")
        if k and v:
            _learned_cache[k] = v
    logger.info(f"[LearnedCache] Loaded {len(_learned_cache)} saved mappings from DB")


async def persist_learned_mapping(
    header_norm_key: str,
    canonical: str,
    original_header: str,
    user_id: str,
) -> None:
    """
    Persist a header→canonical mapping to MongoDB.
    Uses learned_mappings_collection which is imported from database.
    """
    try:
        from database import learned_mappings_collection
        existing = await learned_mappings_collection.find_one(
            {"normalized_header": header_norm_key, "user_id": user_id}
        )
        if existing:
            if existing.get("canonical_field") == canonical:
                await learned_mappings_collection.update_one(
                    {"_id": existing["_id"]},
                    {"$inc": {"count": 1}, "$set": {"last_seen": datetime.now(timezone.utc)}}
                )
            else:
                # Conflict: keep majority vote (existing count vs 1)
                if existing.get("count", 1) < 2:
                    await learned_mappings_collection.update_one(
                        {"_id": existing["_id"]},
                        {"$set": {
                            "canonical_field": canonical,
                            "original_header": original_header,
                            "count": 1,
                            "last_seen": datetime.now(timezone.utc)
                        }}
                    )
        else:
            await learned_mappings_collection.insert_one({
                "normalized_header": header_norm_key,
                "original_header": original_header,
                "canonical_field": canonical,
                "user_id": user_id,
                "count": 1,
                "created_at": datetime.now(timezone.utc),
                "last_seen": datetime.now(timezone.utc),
            })
        update_learned_cache(header_norm_key, canonical)
    except Exception as exc:
        logger.warning(f"[LearnedCache] Could not persist mapping '{header_norm_key}'→'{canonical}': {exc}")


# ─────────────────────────────────────────────────────────────────────────────
# MAIN COLUMN MAPPER — runs all 3 tiers + fallback
# ─────────────────────────────────────────────────────────────────────────────

def match_column(col: str, series: Optional[pd.Series] = None) -> str:
    """
    Map a raw column header to a canonical field name using 3-tier logic.
    Optionally, the column's data series can be provided for value-pattern fallback.

    Returns: canonical field name OR the original col if no match found.
    """
    normalized = normalize_col(col)
    norm_key = normalize_header_key(col)

    if not normalized:
        return col.strip()

    # TIER 3a: Check learned cache first (fastest)
    learned = get_learned_mapping(norm_key)
    if learned:
        logger.info(f"[ColMapper] '{col}' → '{learned}' (learned memory)")
        return learned

    # TIER 1: Keyword scoring
    kw_match, kw_score = _keyword_score(normalized)
    if kw_score >= 2:
        logger.info(f"[ColMapper] '{col}' → '{kw_match}' (keyword score={kw_score})")
        return kw_match  # type: ignore

    # TIER 2: Fuzzy match (requires rapidfuzz)
    fz_match, fz_score = _fuzzy_score(normalized)
    if fz_score >= 82:
        logger.info(f"[ColMapper] '{col}' → '{fz_match}' (fuzzy score={fz_score})")
        return fz_match  # type: ignore

    # TIER 4: Value-pattern classification (if series provided)
    if series is not None:
        val_match = _classify_column_by_values(series)
        if val_match:
            logger.info(f"[ColMapper] '{col}' → '{val_match}' (data-pattern classification)")
            return val_match

    logger.debug(f"[ColMapper] '{col}' → UNMAPPED (kept as-is)")
    return col.strip()


# ─────────────────────────────────────────────────────────────────────────────
# VEHICLE NUMBER NORMALISATION
# ─────────────────────────────────────────────────────────────────────────────

def normalize_vehicle_number(value: str) -> str:
    """Strip all non-alphanumeric chars and uppercase."""
    return re.sub(r'[^A-Za-z0-9]', '', str(value).strip()).upper()


def _is_plate_value(val: str) -> bool:
    clean = re.sub(r'\s', '', str(val).strip())
    return bool(_PLATE_RE.match(clean))


def build_searchable_tokens(raw_plate: str) -> List[str]:
    """
    Generate all searchable forms of a plate number so search always finds it
    no matter how it was entered.
    GJ-06-RC-1934 / GJ 06 RC 1934 / gj06rc1934 / GJ06RC1934 → all stored.
    """
    tokens = set()
    raw = str(raw_plate).strip()
    clean = re.sub(r'[^A-Za-z0-9]', '', raw).upper()   # GJ06RC1934
    tokens.add(raw)
    tokens.add(clean)
    tokens.add(clean.lower())
    tokens.add(raw.upper())
    tokens.add(raw.lower())
    # Also add with common separators stripped
    tokens.add(re.sub(r'\s+', '', raw).upper())
    return [t for t in tokens if t]


# ─────────────────────────────────────────────────────────────────────────────
# PLATE-REGEX AUTO-DETECTION FALLBACK (if no column mapped to Vehicle)
# ─────────────────────────────────────────────────────────────────────────────

def _guess_vehicle_column(df: pd.DataFrame) -> Optional[str]:
    best_col: Optional[str] = None
    best_ratio = 0.0
    for col in df.columns:
        values = df[col].dropna().astype(str)
        if len(values) == 0:
            continue
        match_count = sum(1 for v in values if _is_plate_value(v))
        ratio = match_count / len(values)
        if ratio > best_ratio and ratio >= 0.30:
            best_ratio = ratio
            best_col = col
    if best_col:
        logger.info(f"[ColMapper] Plate-regex fallback: '{best_col}' is vehicle column ({best_ratio:.0%} plate-like values)")
    return best_col


# ─────────────────────────────────────────────────────────────────────────────
# CORE DATAFRAME PROCESSOR
# ─────────────────────────────────────────────────────────────────────────────

def _process_dataframe(
    df_raw: pd.DataFrame,
    sheet_name: str,
    user_id: str = "system",
) -> Tuple[List[Dict], Dict[str, str]]:
    """
    Process a raw DataFrame through all 5 layers.
    Returns: (records, column_mapping_report)
    """
    if df_raw.empty:
        return [], {}

    # ── LAYER 1: Find real header row ─────────────────────────────────────────
    header_row_idx = find_header_row(df_raw)

    # Re-read from the detected header row
    header_row = df_raw.iloc[header_row_idx].astype(str).tolist()
    data_rows = df_raw.iloc[header_row_idx + 1:].reset_index(drop=True)
    data_rows.columns = pd.Index(header_row)

    # ── LAYER 2: Normalise headers ────────────────────────────────────────────
    # Drop fully unnamed/nan columns
    data_rows = data_rows.loc[:, ~data_rows.columns.str.match(r'^(nan|none|\s*)$', case=False)]
    # Drop fully empty rows
    data_rows = data_rows.dropna(how='all')

    if data_rows.empty:
        return [], {}

    # ── LAYER 3+4: Map each column → canonical field ──────────────────────────
    mapping_report: Dict[str, str] = {}  # original_header → canonical
    new_col_names: List[str] = []

    seen_canonical: Dict[str, int] = {}  # to handle duplicate canonical mappings

    for col in data_rows.columns:
        col_str = str(col).strip()
        if col_str.startswith('Unnamed') or col_str.lower() in ('nan', 'none', ''):
            new_col_names.append(col_str)
            continue

        series = data_rows[col]
        canonical = match_column(col_str, series=series)

        # Deduplicate: if same canonical already used, append index
        if canonical in seen_canonical:
            seen_canonical[canonical] += 1
            canonical = f"{canonical}_{seen_canonical[canonical]}"
        else:
            seen_canonical[canonical] = 0

        mapping_report[col_str] = canonical
        new_col_names.append(canonical)

    data_rows.columns = pd.Index(new_col_names)

    # ── If still no Vehicle column, try plate-regex fallback ─────────────────
    if VEHICLE_FIELD not in data_rows.columns:
        fallback_col = _guess_vehicle_column(data_rows)
        if fallback_col:
            data_rows = data_rows.rename(columns={fallback_col: VEHICLE_FIELD})
            mapping_report[fallback_col] = VEHICLE_FIELD
        else:
            logger.warning(f"[Upload] Sheet '{sheet_name}': NO vehicle column detected after all layers. Columns: {list(data_rows.columns)[:10]}")

    # ── Persist learned mappings asynchronously ───────────────────────────────
    _schedule_persist(mapping_report, user_id)

    # ── Build records ─────────────────────────────────────────────────────────
    records: List[Dict] = []

    for _, row in data_rows.iterrows():
        row_dict: Dict[str, str] = {}
        for k, v in row.items():
            key = str(k).strip()
            if not key or key.startswith('Unnamed') or key.lower() in ('nan', 'none', ''):
                continue
            val = str(v).strip() if pd.notna(v) else ''
            if val.lower() in ('nan', 'none'):
                val = ''
            row_dict[key] = val

        raw_vnum = row_dict.get(VEHICLE_FIELD, '')
        if not raw_vnum or raw_vnum.lower() in ('', 'nan', 'none', '-'):
            # ── EMERGENCY RECOVERY: scan ALL values in this row for a plate pattern ──
            recovered = ''
            for cell_key, cell_val in row_dict.items():
                v = str(cell_val).strip()
                if v and v.lower() not in ('nan', 'none', '-', '') and _is_plate_value(v):
                    recovered = v
                    logger.info(f"[Upload] Emergency recovery: found plate '{v}' in column '{cell_key}'")
                    break
            if not recovered:
                continue  # Truly no plate anywhere in this row — skip it
            raw_vnum = recovered

        vnum = normalize_vehicle_number(raw_vnum)
        if not vnum:
            continue

        # Build data: FIXED_FIELDS first, then all extra columns
        data: Dict[str, str] = {}
        for field in FIXED_FIELDS:
            data[field] = row_dict.get(field, '')

        # Merge firstName/lastName → ownerName if needed
        if not data.get('ownerName'):
            fn = row_dict.get('firstName', '').strip()
            ln = row_dict.get('lastName', '').strip()
            if fn or ln:
                data['ownerName'] = f'{fn} {ln}'.strip()

        # Preserve ALL extra columns
        for k, v in row_dict.items():
            if k not in data and k not in ('firstName', 'lastName'):
                data[k] = v

        data[VEHICLE_FIELD] = vnum

        # ── Build searchable_tokens for all normalized plate forms ────────────
        s_tokens = build_searchable_tokens(raw_vnum)

        records.append({
            "vehicle_number": vnum,
            "sheet_name": sheet_name,
            "data": data,
            "column_map": mapping_report,
            "searchable_tokens": s_tokens,
        })

    logger.info(f"[Upload] Sheet '{sheet_name}': {len(records)} valid records from {len(data_rows)} rows")
    return records, mapping_report


def _schedule_persist(mapping_report: Dict[str, str], user_id: str) -> None:
    """Fire-and-forget: schedule DB persistence of learned mappings."""
    async def _do():
        for orig_header, canonical in mapping_report.items():
            if canonical in FIXED_FIELDS or canonical == VEHICLE_FIELD:
                norm_key = normalize_header_key(orig_header)
                await persist_learned_mapping(norm_key, canonical, orig_header, user_id)

    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(_do())
    except Exception:
        pass  # Non-critical


# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC ENTRY POINTS
# ─────────────────────────────────────────────────────────────────────────────

def parse_and_normalize(
    file_bytes: bytes,
    filename: str,
    sheet_name: str = "default",
    user_id: str = "system",
) -> Tuple[List[Dict], List[str], str]:
    """
    Parse an uploaded Excel/CSV. Auto-detects header rows, normalises headers,
    maps to canonical schema, classifies by data patterns, and persists learned mappings.

    Returns: (records, fixed_columns_list, vehicle_field_name)
    """
    if filename.lower().endswith(".csv"):
        df_raw = pd.read_csv(BytesIO(file_bytes), dtype=str, keep_default_na=False, header=None)
        records, _ = _process_dataframe(df_raw, sheet_name, user_id)
        return records, FIXED_FIELDS, VEHICLE_FIELD

    # Excel — read ALL sheets raw (no header assumption)
    try:
        all_sheets: Dict[str, pd.DataFrame] = pd.read_excel(
            BytesIO(file_bytes), sheet_name=None, dtype=str,
            keep_default_na=False, header=None
        )
    except Exception as exc:
        logger.warning(f"[Upload] Multi-sheet read failed ({exc}), falling back single sheet")
        df_raw = pd.read_excel(BytesIO(file_bytes), dtype=str, keep_default_na=False, header=None)
        records, _ = _process_dataframe(df_raw, sheet_name, user_id)
        return records, FIXED_FIELDS, VEHICLE_FIELD

    records: List[Dict] = []

    if len(all_sheets) == 1:
        tab_df = list(all_sheets.values())[0]
        recs, _ = _process_dataframe(tab_df, sheet_name, user_id)
        records = recs
    else:
        for tab_name, tab_df in all_sheets.items():
            cleaned_tab = tab_name.strip() or sheet_name
            tab_recs, _ = _process_dataframe(tab_df, cleaned_tab, user_id)
            records.extend(tab_recs)

    return records, FIXED_FIELDS, VEHICLE_FIELD


def export_to_excel(records: List[Dict]) -> bytes:
    """Export records to Excel, canonical fields first then extras."""
    rows = []
    for rec in records:
        data = rec.get("data", {})
        row: Dict[str, Any] = {}
        for field in FIXED_FIELDS:
            row[field] = data.get(field, '')
        for k, v in data.items():
            if k not in row:
                row[k] = v
        rows.append(row)

    all_cols = list(dict.fromkeys([*FIXED_FIELDS] + [c for r in rows for c in r]))
    df = pd.DataFrame(rows, columns=all_cols)
    output = BytesIO()
    df.to_excel(output, index=False)
    return output.getvalue()
