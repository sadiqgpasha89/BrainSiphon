"""Address normalisation, parcel identification, property-unit relationships, and duplicate-listing resolution."""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

ABBREV = {"street": "st", "avenue": "ave", "road": "rd", "drive": "dr", "boulevard": "blvd", "lane": "ln", "court": "ct", "place": "pl", "north": "n", "south": "s", "east": "e", "west": "w", "apartment": "apt", "suite": "ste", "unit": "unit"}
UNIT_RX = re.compile(r"(?:\b(?:apt|apartment|unit|ste|suite)\s+|#\s*)([A-Za-z0-9-]+)", re.I)


def normalise(addr: str) -> Dict[str, str]:
    """Lower-case, strip punctuation, standardise suffixes and directionals, separate the unit. Returns the key used to match records across sources."""
    a = re.sub(r"[.,]", " ", addr.lower())
    a = re.sub(r"\s+", " ", a).strip()
    unit = ""
    m = UNIT_RX.search(a)
    if m:  # the unit can sit before the city, state and ZIP: remove it wherever it is
        unit = m.group(1).upper()
        a = (a[: m.start()] + " " + a[m.end():]).strip()
        a = re.sub(r"\s+", " ", a)
    a = " ".join(ABBREV.get(w, w) for w in a.split())
    m2 = re.search(r"\b(\d{5})(?:-\d{4})?$", a)
    zip5 = m2.group(1) if m2 else ""
    return {"street_key": a, "unit": unit, "zip5": zip5, "key": f"{a}|{unit}"}


def parcel_id(raw: str, pattern: str = r"^\d{2}-\d{3}-\d{3}$", strip: str = r"[\s.]") -> Dict[str, Any]:
    """Parcel identifiers are county-specific. A market pack supplies the format; anything that does not fit is reported, not guessed."""
    s = re.sub(strip, "", str(raw))
    digits = re.sub(r"\D", "", s)
    ok = bool(re.fullmatch(pattern, s))
    return {"raw": raw, "normalised": s, "digits": digits, "valid": ok}


def resolve_duplicates(listings: List[Dict[str, Any]], *, window_days: int = 270) -> Dict[str, Any]:
    """Same property relisted (a withdrawn then relisted, a different agent, a new MLS number): one property, several listings. Grouped by normalised address and unit,
    the latest closed sale per property and date window is the comparable; earlier closed records inside the window are flagged as probable duplicates of one transaction."""
    import datetime as dt
    groups: Dict[str, List[Dict[str, Any]]] = {}
    for l in listings:
        groups.setdefault(normalise(l["address_raw"])["key"], []).append(l)
    props, dups = [], []
    for k, ls in groups.items():
        ls.sort(key=lambda x: x.get("sale_date") or x.get("modified_at") or "")
        sold = [x for x in ls if x.get("status") == "Closed" and x.get("sale_date")]
        keep: List[Dict[str, Any]] = []
        for s in sold:
            if keep and (dt.date.fromisoformat(s["sale_date"]) - dt.date.fromisoformat(keep[-1]["sale_date"])).days < 30 and abs(s["sale_price"] - keep[-1]["sale_price"]) / keep[-1]["sale_price"] < 0.01:
                dups.append({"property": k, "kept": keep[-1]["listing_id"], "duplicate": s["listing_id"]})
                continue
            keep.append(s)
        props.append({"property_key": k, "listings": [x["listing_id"] for x in ls], "sales": [x["listing_id"] for x in keep]})
    return {"properties": props, "probable_duplicate_sales": dups}


def unit_relationships(records: List[Dict[str, Any]]) -> Dict[str, List[str]]:
    """Building -> units. A condominium unit is valued as a unit, with the building's other units as its natural comparables."""
    b: Dict[str, List[str]] = {}
    for r in records:
        n = normalise(r["address_raw"])
        if n["unit"]:
            b.setdefault(n["street_key"], []).append(n["unit"])
    return {k: sorted(set(v)) for k, v in b.items()}
