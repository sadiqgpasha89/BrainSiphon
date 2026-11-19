"""EDI X12 and EDIFACT parsing and transformation to canonical milestone events.

File exchange (EDI over AS2 or SFTP) is asynchronous and batch-shaped; it is a different integration from the synchronous REST/gRPC ETA
API and is kept apart from it. X12 214 (carrier shipment status) and EDIFACT IFTSTA (status report) are the two status messages this pack handles."""
from __future__ import annotations

import datetime as dt
import hashlib
from typing import Any, Dict, List, Optional

AT7_STATUS = {"AF": "DEPARTED_PICKUP", "X3": "ARRIVED_PICKUP", "X6": "IN_TRANSIT", "X1": "ARRIVED_DELIVERY", "D1": "DELIVERED", "AG": "ESTIMATED_DELIVERY", "AB": "DELIVERY_APPOINTMENT", "SD": "AVAILABLE_FOR_DELIVERY", "A3": "DELIVERY_REFUSED", "AM": "LOADED_ON_TRUCK", "P1": "DEPARTED_TERMINAL", "I1": "IN_TRANSIT", "X2": "ARRIVED_TERMINAL"}
AT7_REASON = {"NS": "normal status", "AA": "pickup appointment", "AD": "delivery appointment", "A9": "weather", "AF": "carrier delay", "AO": "mechanical breakdown", "B4": "customs hold", "AI": "consignee closed"}
IFTSTA_STATUS = {"1": "IN_TRANSIT", "3": "DELIVERED", "4": "DEPARTED", "5": "ARRIVED", "7": "EXCEPTION"}


class EdiError(ValueError):
    pass


def split_x12(text: str) -> List[List[str]]:
    text = text.lstrip("﻿\r\n ")
    if not text.startswith("ISA") or len(text) < 106:
        raise EdiError("not an X12 interchange: it must start with a 106-character ISA segment")
    el, sub, term = text[3], text[104], text[105]
    segs = [s.strip("\r\n ") for s in text.split(term) if s.strip("\r\n ")]
    return [s.split(el) for s in segs] if all(len(s) for s in segs) else []


def _t(date: str, time: str, tz: str) -> Optional[str]:
    if not date:
        return None
    fmt, s = ("%Y%m%d%H%M", date + (time or "0000")[:4]) if len(date) == 8 else ("%y%m%d%H%M", date + (time or "0000")[:4])
    d = dt.datetime.strptime(s, fmt)
    off = {"LT": 0, "UT": 0, "ET": -5, "CT": -6, "MT": -7, "PT": -8}.get(tz, 0)  # a real mapping needs the facility time zone: here local time is treated as UTC and flagged
    return (d - dt.timedelta(hours=off)).replace(tzinfo=dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_214(text: str, carrier: str = "") -> List[Dict[str, Any]]:
    """One canonical milestone per AT7 segment. The time zone code is applied; `LT` (local time) is **flagged** because the facility's zone is needed to convert it."""
    segs = split_x12(text)
    isa = next(s for s in segs if s[0] == "ISA")
    st = next((s for s in segs if s[0] == "ST"), None)
    if not st or st[1] != "214":
        raise EdiError(f"expected transaction set 214, got {st[1] if st else 'none'}")
    b10 = next((s for s in segs if s[0] == "B10"), None)
    if not b10:
        raise EdiError("B10 (shipment identification) is required")
    refs = {s[2] if len(s) > 2 else "": s[1] for s in segs if s[0] == "L11" and len(s) > 1}
    ms1 = next((s for s in segs if s[0] == "MS1"), [""] * 4)
    scac = isa[6].strip() if len(isa) > 6 else carrier
    out: List[Dict[str, Any]] = []
    for s in segs:
        if s[0] != "AT7":
            continue
        code = s[1] if len(s) > 1 else ""
        reason = s[2] if len(s) > 2 else ""
        tz = s[7] if len(s) > 7 else ""
        when = _t(s[5] if len(s) > 5 else "", s[6] if len(s) > 6 else "", tz)
        key = hashlib.sha256(f"{scac}|{b10[1]}|{code}|{when}".encode()).hexdigest()[:24]
        out.append({"shipment_ref": b10[2] if len(b10) > 2 and b10[2] else b10[1], "carrier_pro": b10[1], "carrier": scac or carrier, "milestone": AT7_STATUS.get(code, f"UNMAPPED_{code}"), "status_code": code, "reason": AT7_REASON.get(reason, reason),
                    "event_time": when, "time_basis": "local-treated-as-utc" if tz == "LT" else "stated-zone", "location": {"city": ms1[1] if len(ms1) > 1 else "", "state": ms1[2] if len(ms1) > 2 else "", "country": ms1[3] if len(ms1) > 3 else ""},
                    "po": refs.get("PO", ""), "source_format": "X12-214", "message_id": key, "issues": ["status code not mapped"] if code not in AT7_STATUS else []})
    if not out:
        raise EdiError("no AT7 status segment in the 214")
    return out


def build_997(isa_control: str, group_control: str, accepted: bool = True) -> str:
    """Functional acknowledgement. Send within the window the partner agreed: an unacknowledged interchange is retransmitted."""
    return f"ST*997*0001~AK1*QM*{group_control}~AK9*{'A' if accepted else 'R'}*1*1*{1 if accepted else 0}~SE*4*0001~"


def _split(s: str, sep: str, rel: str) -> List[str]:
    """Split on `sep`, but not where it is preceded by the release character (`?+` is a literal plus; `??` is a literal question mark)."""
    out, cur, i = [], "", 0
    while i < len(s):
        c = s[i]
        if c == rel and i + 1 < len(s):
            cur += c + s[i + 1]
            i += 2
            continue
        if c == sep:
            out.append(cur)
            cur = ""
        else:
            cur += c
        i += 1
    out.append(cur)
    return out


def _unescape(s: str, rel: str) -> str:
    out, i = "", 0
    while i < len(s):
        if s[i] == rel and i + 1 < len(s):
            i += 1
        out += s[i]
        i += 1
    return out


def parse_iftsta(text: str, carrier: str = "") -> List[Dict[str, Any]]:
    if not text.startswith("UNA") and not text.startswith("UNB"):
        raise EdiError("not an EDIFACT interchange (expected UNA or UNB)")
    una = text[:9] if text.startswith("UNA") else "UNA:+.? '"
    comp, el, _dec, rel, _res, term = una[3], una[4], una[5], una[6], una[7], una[8]
    body = text[9:] if text.startswith("UNA") else text
    segs = [s.strip("\r\n ") for s in _split(body, term, rel)]
    parsed = [_split(s, el, rel) for s in segs if s]
    if not any(p[0] == "UNH" and len(p) > 2 and p[2].startswith("IFTSTA") for p in parsed):
        raise EdiError("message type IFTSTA expected")
    c = lambda e: [_unescape(x, rel) for x in _split(e, comp, rel)]  # noqa: E731 - components of an element
    bgm = next((p for p in parsed if p[0] == "BGM"), None)
    ref = _unescape(bgm[2], rel) if bgm and len(bgm) > 2 else ""
    dtm = next((p for p in parsed if p[0] == "DTM"), None)
    when = None
    if dtm:
        q, val, fmt = (c(dtm[1]) + ["", ""])[:3]
        when = dt.datetime.strptime(val, "%Y%m%d%H%M" if fmt == "203" else "%Y%m%d").replace(tzinfo=dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    loc = next((p for p in parsed if p[0] == "LOC"), None)
    out = []
    for p in parsed:
        if p[0] == "STS" and len(p) > 2:
            code = c(p[2])[0]
            out.append({"shipment_ref": ref, "carrier": carrier, "milestone": IFTSTA_STATUS.get(code, f"UNMAPPED_{code}"), "status_code": code, "event_time": when, "location": {"un_locode": c(loc[2])[0] if loc and len(loc) > 2 else ""},
                        "source_format": "EDIFACT-IFTSTA", "message_id": hashlib.sha256(f"{carrier}|{ref}|{code}|{when}".encode()).hexdigest()[:24], "issues": []})
    if not out:
        raise EdiError("no STS status segment in the IFTSTA")
    return out
