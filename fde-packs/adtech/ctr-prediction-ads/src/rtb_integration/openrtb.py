"""OpenRTB 2.5 bid request validation, response building and no-bid reasons, with per-exchange profiles.

OpenRTB is a specification with exchange-specific extensions, required fields and quirks. The core below follows the 2.5 object model (BidRequest,
Imp, Site/App, Device, User, Regs, Bid, SeatBid, BidResponse and the `nbr` no-bid reasons). OpenRTB 3.0 wraps the same semantics in an AdCOM envelope: map it in a second profile."""
from __future__ import annotations

import json
from typing import Any, Dict, List, Optional, Tuple

NBR = {0: "Unknown error", 1: "Technical error", 2: "Invalid request", 3: "Known web spider", 4: "Suspected non-human traffic", 5: "Cloud, data centre or proxy IP", 6: "Unsupported device",
       7: "Blocked publisher or site", 8: "Unmatched user", 9: "Daily reader cap met", 10: "Daily domain cap met", 11: "Ads.txt authorization unavailable", 12: "Ads.txt authorization violation"}
# exchange-specific no-bid reasons start at 500 in the specification; these are this pack's own
NBR_LOCAL = {500: "Consent not established for the purposes needed", 501: "Deadline exceeded: no time left to bid", 502: "Scoring or feature service unavailable", 503: "Budget, pacing or frequency cap exhausted", 504: "Exchange traffic share is zero (canary)"}


class RtbError(ValueError):
    def __init__(self, msg: str, nbr: int = 2):
        super().__init__(msg)
        self.nbr = nbr


def validate_request(r: Dict[str, Any], profile: Optional[Dict[str, Any]] = None) -> None:
    prof = profile or {}
    if not r.get("id"):
        raise RtbError("BidRequest.id is required")
    if not isinstance(r.get("imp"), list) or not r["imp"]:
        raise RtbError("BidRequest.imp must be a non-empty array")
    ids = [i.get("id") for i in r["imp"]]
    if len(set(ids)) != len(ids) or not all(ids):
        raise RtbError("Imp.id must be present and unique")
    if not (r.get("site") or r.get("app")) or (r.get("site") and r.get("app")):
        raise RtbError("exactly one of Site or App must be present")
    for i in r["imp"]:
        if not any(i.get(t) for t in ("banner", "video", "audio", "native")):
            raise RtbError(f"Imp {i.get('id')} has no banner, video, audio or native object")
        if "bidfloor" in i and i["bidfloor"] < 0:
            raise RtbError(f"Imp {i.get('id')} bidfloor is negative")
    if r.get("tmax") is not None and not (1 <= int(r["tmax"]) <= 5000):
        raise RtbError("tmax must be between 1 and 5000 ms")
    for path in prof.get("required_ext", []):
        node = r
        for part in path.split("."):
            node = node.get(part) if isinstance(node, dict) else None
        if node in (None, ""):
            raise RtbError(f"this exchange requires {path}")


def to_score_request(r: Dict[str, Any], imp: Dict[str, Any], profile: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """BidRequest + Imp -> internal ScoreRequest (the CTR model's input contract). One request per impression."""
    dev, user = r.get("device", {}), r.get("user", {})
    site = r.get("site") or r.get("app")
    prof = profile or {}
    return {
        "request_id": r["id"], "imp_id": imp["id"], "exchange": prof.get("id", ""), "tmax_ms": int(r.get("tmax", prof.get("default_tmax_ms", 100))),
        "placement": f"{imp.get('banner', {}).get('w', 0)}x{imp.get('banner', {}).get('h', 0)}" if imp.get("banner") else "video" if imp.get("video") else "native",
        "bidfloor": float(imp.get("bidfloor", 0.0)), "bidfloorcur": imp.get("bidfloorcur", "USD"),
        "site_domain": (site or {}).get("domain", ""), "page": (site or {}).get("page", ""), "publisher_id": ((site or {}).get("publisher") or {}).get("id", ""),
        "device_type": dev.get("devicetype", 0), "os": dev.get("os", ""), "make": dev.get("make", ""), "country": (dev.get("geo") or {}).get("country", ""), "ua_hash": str(abs(hash(dev.get("ua", ""))) % 10**8),
        "user_id_hash": str(abs(hash(user.get("id", ""))) % 10**12) if user.get("id") else "", "has_consent_string": bool((user.get("ext") or {}).get("consent")),
        "ip_prefix": ".".join((dev.get("ip") or "").split(".")[:3]),
    }


def build_response(req: Dict[str, Any], bids: List[Dict[str, Any]], cur: str = "USD", seat: str = "seat-1") -> Dict[str, Any]:
    """One BidResponse. A bid needs id, impid, price, and adm or nurl; every impid must exist in the request, and price must clear the floor."""
    imps = {i["id"]: i for i in req["imp"]}
    out = []
    for b in bids:
        if b["impid"] not in imps:
            raise RtbError(f"bid for unknown impid {b['impid']}")
        if b["price"] < imps[b["impid"]].get("bidfloor", 0.0):
            continue  # below the floor: do not bid (a bid below the floor is rejected by the exchange and counts against you)
        if not (b.get("adm") or b.get("nurl")):
            raise RtbError("a bid needs adm or nurl")
        out.append({k: v for k, v in b.items() if v is not None})
    if not out:
        return no_bid(req, 0)
    return {"id": req["id"], "cur": cur, "seatbid": [{"seat": seat, "bid": out}]}


def no_bid(req: Dict[str, Any], nbr: int) -> Dict[str, Any]:
    """The no-bid response: HTTP 204 with no body is the cheapest valid answer; the JSON form with `nbr` is for exchanges that want a reason."""
    return {"id": req.get("id", ""), "nbr": nbr if nbr in NBR else 0, "_local_reason": NBR_LOCAL.get(nbr, NBR.get(nbr, ""))}


def clearing_price_second_price(bids: List[float], floor: float = 0.0) -> Tuple[Optional[int], float]:
    """Second-price auction: the winner pays the larger of the runner-up and the floor (plus one cent increment is the exchange's rule: confirm it)."""
    if not bids:
        return None, 0.0
    order = sorted(range(len(bids)), key=lambda i: -bids[i])
    if bids[order[0]] < floor:
        return None, 0.0
    runner = bids[order[1]] if len(bids) > 1 else 0.0
    return order[0], max(runner, floor)
