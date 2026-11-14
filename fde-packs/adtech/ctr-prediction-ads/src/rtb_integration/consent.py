"""Consent: validate the signal before any feature is fetched or any score is computed.

TCF v2 consent strings: the core segment is base64url of a bit field. Only the fields needed for the decision are decoded here (version, CMP id,
vendor list version, purposes consented, purposes with legitimate interest, vendor consent). Decode with the IAB's reference library in production; this exists so the decision point,
the failure behaviour and the tests are concrete."""
from __future__ import annotations

import base64
from typing import Any, Dict, Optional, Set


class ConsentError(ValueError):
    pass


def _bits(b64: str) -> str:
    core = b64.split(".")[0]
    raw = base64.urlsafe_b64decode(core + "=" * (-len(core) % 4))
    return "".join(f"{b:08b}" for b in raw)


def _int(bits: str, start: int, n: int) -> int:
    return int(bits[start : start + n], 2)


def decode_tcf_v2(s: str) -> Dict[str, Any]:
    bits = _bits(s)
    if len(bits) < 230:
        raise ConsentError("consent string is too short to be TCF v2")
    version = _int(bits, 0, 6)
    if version != 2:
        raise ConsentError(f"TCF version {version} is not supported")
    purposes = {i + 1 for i in range(24) if bits[152 + i] == "1"}
    li = {i + 1 for i in range(24) if bits[176 + i] == "1"}
    max_vendor = _int(bits, 213, 16)
    encoding = bits[229]  # 0 = bit field, 1 = range
    vendors: Set[int] = set()
    if encoding == "0":
        vendors = {i + 1 for i in range(max_vendor) if bits[230 + i : 231 + i] == "1"}
    else:
        n = _int(bits, 230, 12)
        o = 242
        for _ in range(n):
            is_range = bits[o] == "1"
            o += 1
            a = _int(bits, o, 16)
            o += 16
            if is_range:
                b = _int(bits, o, 16)
                o += 16
                vendors |= set(range(a, b + 1))
            else:
                vendors.add(a)
    return {"version": version, "cmp_id": _int(bits, 78, 12), "vendor_list_version": _int(bits, 120, 12), "purposes_consent": purposes, "purposes_li": li, "vendors": vendors}


def build_tcf_v2(purposes: Set[int], vendors: Set[int], cmp_id: int = 7, vendor_list_version: int = 100, *, ranges: bool = False) -> str:
    """Build a TCF v2 core segment for tests, with the field offsets of the specification (see decode_tcf_v2)."""
    def f(value: int, n: int) -> str:
        return format(value, f"0{n}b")

    max_v = max(vendors) if vendors else 0
    bits = f(2, 6) + f(0, 36) + f(0, 36) + f(cmp_id, 12) + f(1, 12) + f(1, 6) + f(0, 12) + f(vendor_list_version, 12) + f(2, 6) + "0" + "0" + f(0, 12)
    assert len(bits) == 152
    bits += "".join("1" if i + 1 in purposes else "0" for i in range(24)) + "0" * 24 + "0" + f(0, 12) + f(max_v, 16)
    if ranges:
        ids = sorted(vendors)
        runs, start = [], None
        for v in ids:
            if start is None:
                start = prev = v
            elif v == prev + 1:
                prev = v
            else:
                runs.append((start, prev))
                start = prev = v
        if start is not None:
            runs.append((start, prev))
        bits += "1" + f(len(runs), 12) + "".join(("1" + f(a, 16) + f(b, 16)) if a != b else ("0" + f(a, 16)) for a, b in runs)
    else:
        bits += "0" + "".join("1" if i + 1 in vendors else "0" for i in range(max_v))
    bits += "0" * (-len(bits) % 8)
    raw = bytes(int(bits[i : i + 8], 2) for i in range(0, len(bits), 8))
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def us_privacy_ok(s: str) -> bool:
    """IAB US Privacy string 1YNN: version, notice given, opt-out of sale, LSPA. Opt-out `Y` means personalised use for sale is not allowed."""
    return len(s) == 4 and s[0] == "1" and s[2] != "Y"


def may_process(req: Dict[str, Any], *, our_vendor_id: int, required_purposes: Set[int], gdpr_applies_hint: bool = False) -> Dict[str, Any]:
    """The gate in front of feature retrieval. Returns {"allowed": bool, "reason": str}. Default is **deny** when consent is needed and cannot be established."""
    regs = (req.get("regs") or {}).get("ext") or {}
    user = (req.get("user") or {}).get("ext") or {}
    gdpr = regs.get("gdpr")
    if gdpr is None and gdpr_applies_hint:
        gdpr = 1
    if regs.get("us_privacy") and not us_privacy_ok(regs["us_privacy"]):
        return {"allowed": False, "reason": "US Privacy string signals opt-out of sale"}
    if (req.get("regs") or {}).get("coppa") == 1:
        return {"allowed": False, "reason": "COPPA child-directed traffic"}
    if (req.get("device") or {}).get("lmt") == 1:
        return {"allowed": False, "reason": "limit ad tracking is on"}
    if gdpr == 1:
        if not user.get("consent"):
            return {"allowed": False, "reason": "GDPR applies and no consent string was sent"}
        try:
            c = decode_tcf_v2(user["consent"])
        except (ConsentError, ValueError) as e:
            return {"allowed": False, "reason": f"consent string unreadable: {e}"}
        if our_vendor_id not in c["vendors"]:
            return {"allowed": False, "reason": f"vendor {our_vendor_id} has no consent"}
        missing = required_purposes - c["purposes_consent"]
        if missing:
            return {"allowed": False, "reason": f"purposes without consent: {sorted(missing)}"}
    return {"allowed": True, "reason": "ok"}
