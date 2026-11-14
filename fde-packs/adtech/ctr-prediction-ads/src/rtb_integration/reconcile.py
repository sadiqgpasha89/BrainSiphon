"""Event reconciliation: bids, win and loss notices, impressions, clicks, conversions and billing must agree, per exchange and per campaign.

The model's decisions create spend. If the bid log, the win notices, the impression beacons and the billing statement disagree, someone is being charged for
something that did not happen, or something that happened is not being billed. The checks below are the daily ones."""
from __future__ import annotations

from typing import Any, Dict, Iterable, List


def reconcile(bids: Iterable[Dict[str, Any]], wins: Iterable[Dict[str, Any]], impressions: Iterable[Dict[str, Any]], clicks: Iterable[Dict[str, Any]], billing: Iterable[Dict[str, Any]], *,
              tolerance: float = 0.02, discrepancy_rate_limit: float = 0.05) -> Dict[str, Any]:
    """bids {"bid_id","exchange","campaign","price"}; wins {"bid_id","clearing"}; impressions {"bid_id"}; clicks {"bid_id"}; billing {"exchange","amount"}."""
    B = {b["bid_id"]: b for b in bids}
    W = {w["bid_id"]: w for w in wins}
    I = {i["bid_id"] for i in impressions}
    C = [c["bid_id"] for c in clicks]
    wins_no_impr = sorted(b for b in W if b not in I)
    impr_no_win = sorted(b for b in I if b not in W)
    clicks_no_impr = sorted(c for c in C if c not in I)
    unknown_wins = sorted(b for b in W if b not in B)
    over_bid = sorted(b for b, w in W.items() if b in B and w["clearing"] > B[b]["price"] + 1e-9)  # a second-price clearing above our bid would be an exchange error
    dup_clicks = sorted({c for c in C if C.count(c) > 1})
    by_ex: Dict[str, Dict[str, float]] = {}
    for b, w in W.items():
        ex = B.get(b, {}).get("exchange", "unknown")
        d = by_ex.setdefault(ex, {"expected_spend": 0.0, "wins": 0})
        d["expected_spend"] += w["clearing"] / 1000.0 if w.get("cpm", True) else w["clearing"]
        d["wins"] += 1
    billed: Dict[str, float] = {}
    for r in billing:
        billed[r["exchange"]] = billed.get(r["exchange"], 0.0) + r["amount"]
    variance = {}
    for ex in set(by_ex) | set(billed):
        exp, got = by_ex.get(ex, {}).get("expected_spend", 0.0), billed.get(ex, 0.0)
        variance[ex] = {"expected": round(exp, 6), "billed": round(got, 6), "delta": round(got - exp, 6), "within_tolerance": abs(got - exp) <= tolerance * max(exp, 1e-9)}
    disc = (len(wins_no_impr) / len(W)) if W else 0.0
    return {"bids": len(B), "wins": len(W), "impressions": len(I), "clicks": len(C), "win_rate": round(len(W) / len(B), 4) if B else 0.0, "ctr": round(len(set(C)) / len(I), 4) if I else 0.0,
            "wins_without_impression": wins_no_impr, "impressions_without_win": impr_no_win, "clicks_without_impression": clicks_no_impr, "wins_for_unknown_bid": unknown_wins,
            "clearing_above_bid": over_bid, "duplicate_clicks": dup_clicks, "win_to_impression_discrepancy": round(disc, 4), "discrepancy_alert": disc > discrepancy_rate_limit, "billing": variance,
            "billing_ok": all(v["within_tolerance"] for v in variance.values())}
