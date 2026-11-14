"""Coordinates, geofences, location quality and GPS anomalies."""
from __future__ import annotations

import math
import re
from typing import Any, Dict, List, Optional, Tuple

R_KM = 6371.0088


def haversine_km(a: Tuple[float, float], b: Tuple[float, float]) -> float:
    (la1, lo1), (la2, lo2) = [(math.radians(x), math.radians(y)) for x, y in (a, b)]
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * R_KM * math.asin(math.sqrt(h))


def parse_dms(s: str) -> float:
    m = re.fullmatch(r"\s*(\d+)[°\s]+(\d+)['\s]+([\d.]+)[\"\s]*([NSEW])\s*", s)
    if not m:
        raise ValueError(f"cannot parse {s!r} as degrees-minutes-seconds")
    v = int(m.group(1)) + int(m.group(2)) / 60 + float(m.group(3)) / 3600
    return -v if m.group(4) in "SW" else v


def normalise(lat: Any, lon: Any, *, expected_region: Optional[Tuple[float, float, float, float]] = None) -> Dict[str, Any]:
    """WGS84 decimal degrees, latitude first. Detects swapped and out-of-range values; `expected_region` = (min_lat, min_lon, max_lat, max_lon) lets a swap be corrected with confidence."""
    notes: List[str] = []
    la = parse_dms(lat) if isinstance(lat, str) and re.search(r"[NSEW]", lat) else float(lat)
    lo = parse_dms(lon) if isinstance(lon, str) and re.search(r"[NSEW]", lon) else float(lon)
    if not (-90 <= la <= 90) and -90 <= lo <= 90 and -180 <= la <= 180:
        la, lo = lo, la
        notes.append("latitude and longitude were swapped (latitude out of range)")
    elif expected_region and not _in(la, lo, expected_region) and _in(lo, la, expected_region):
        la, lo = lo, la
        notes.append("latitude and longitude were swapped (the swapped pair is inside the expected region)")
    if not (-90 <= la <= 90 and -180 <= lo <= 180):
        raise ValueError(f"coordinates out of range: {la}, {lo}")
    if la == 0 and lo == 0:
        raise ValueError("0,0 is a missing-value placeholder, not a location")
    return {"lat": round(la, 6), "lon": round(lo, 6), "notes": notes}


def _in(la: float, lo: float, r: Tuple[float, float, float, float]) -> bool:
    return r[0] <= la <= r[2] and r[1] <= lo <= r[3]


def in_geofence(point: Tuple[float, float], centre: Tuple[float, float], radius_km: float) -> bool:
    return haversine_km(point, centre) <= radius_km


def quality(accuracy_m: Optional[float], hdop: Optional[float] = None, satellites: Optional[int] = None) -> str:
    """good: usable for geofencing and dwell; degraded: usable for progress only; poor: ignore for decisions."""
    if accuracy_m is None and hdop is None:
        return "unknown"
    acc = accuracy_m if accuracy_m is not None else hdop * 5
    if (satellites is not None and satellites < 4) or acc > 200:
        return "poor"
    return "good" if acc <= 30 else "degraded"


def anomalies(track: List[Dict[str, Any]], max_kmh: float = 130.0) -> List[Dict[str, Any]]:
    """Impossible speeds between consecutive pings (a jump), flagged with the implied speed. `track` is time-sorted: {"lat","lon","t" (epoch s)}."""
    out = []
    for a, b in zip(track, track[1:]):
        dt_h = (b["t"] - a["t"]) / 3600
        if dt_h <= 0:
            out.append({"at": b["t"], "problem": "non-increasing timestamp"})
            continue
        v = haversine_km((a["lat"], a["lon"]), (b["lat"], b["lon"])) / dt_h
        if v > max_kmh:
            out.append({"at": b["t"], "problem": "impossible speed", "kmh": round(v, 1)})
    return out
