"""Post-deployment reconciliation: model decisions against switch outcomes, chargebacks and confirmed-fraud labels.

Four questions, each with a number the business can act on:
  1. Did the switch do what we decided?   (decision vs the final response the switch sent; stand-in and fallback counted separately)
  2. What did we let through that was fraud?   (ALLOW decisions that later became chargebacks or confirmed fraud)
  3. What did we stop that was genuine?   (declines followed by the same card and amount succeeding within the retry window)
  4. What is unaccounted for?   (reversals with no original, decisions with no switch outcome)
"""
from __future__ import annotations

import json
from typing import Any, Dict, Iterable, List


def reconcile(decisions: Iterable[Dict[str, Any]], outcomes: Iterable[Dict[str, Any]], chargebacks: Iterable[Dict[str, Any]] = (), fraud_labels: Iterable[Dict[str, Any]] = (), *,
              retry_window_s: int = 600) -> Dict[str, Any]:
    """decisions: {"txn", "action", "source", "card_token", "amount_minor", "ts"} from the ledger.
    outcomes: {"txn", "switch_code", "ts"} what the switch finally answered. chargebacks / fraud_labels: {"txn"}."""
    dec = {d["txn"]: d for d in decisions}
    out = {o["txn"]: o for o in outcomes}
    cb = {c["txn"] for c in chargebacks}
    fr = {f["txn"] for f in fraud_labels}
    expected = {"ALLOW": {"00", "10"}, "STEP_UP": {"1A"}, "BLOCK": {"59", "05"}}
    mismatched: List[Dict[str, Any]] = []
    by_source: Dict[str, int] = {}
    for t, d in dec.items():
        by_source[d.get("source", "model")] = by_source.get(d.get("source", "model"), 0) + 1
        o = out.get(t)
        if o and o["switch_code"] not in expected[d["action"]]:
            mismatched.append({"txn": t, "decided": d["action"], "switch_answered": o["switch_code"], "source": d.get("source")})
    no_outcome = sorted(t for t in dec if t not in out)
    allowed_bad = sorted(t for t, d in dec.items() if d["action"] == "ALLOW" and (t in cb or t in fr))
    declined = [d for d in dec.values() if d["action"] in ("STEP_UP", "BLOCK")]
    approved_later = []
    for d in declined:
        for o in dec.values():
            if o is not d and o["action"] == "ALLOW" and o["card_token"] == d["card_token"] and o["amount_minor"] == d["amount_minor"] and 0 < o["ts"] - d["ts"] <= retry_window_s:
                approved_later.append({"declined": d["txn"], "approved": o["txn"], "gap_s": o["ts"] - d["ts"]})
                break
    allowed = [d for d in dec.values() if d["action"] == "ALLOW"]
    return {
        "decisions": len(dec), "by_source": by_source,
        "decision_vs_switch": {"mismatches": len(mismatched), "examples": mismatched[:20]},
        "fraud_allowed": {"count": len(allowed_bad), "rate": round(len(allowed_bad) / len(allowed), 5) if allowed else 0.0, "txns": allowed_bad[:50]},
        "probable_false_declines": {"count": len(approved_later), "rate": round(len(approved_later) / len(declined), 5) if declined else 0.0, "examples": approved_later[:20]},
        "unaccounted": {"decisions_without_switch_outcome": len(no_outcome), "outcomes_without_decision": len(set(out) - set(dec))},
    }


def to_markdown(r: Dict[str, Any]) -> str:
    return "\n".join([
        "# Fraud decision reconciliation", "",
        f"- Decisions: **{r['decisions']}** (by source: {json.dumps(r['by_source'])})",
        f"- Decision vs switch answer: **{r['decision_vs_switch']['mismatches']}** mismatch(es)",
        f"- Fraud allowed through: **{r['fraud_allowed']['count']}** ({r['fraud_allowed']['rate']:.3%} of allowed)",
        f"- Probable false declines: **{r['probable_false_declines']['count']}** ({r['probable_false_declines']['rate']:.3%} of declines)",
        f"- Unaccounted: {r['unaccounted']['decisions_without_switch_outcome']} decision(s) with no switch outcome, {r['unaccounted']['outcomes_without_decision']} outcome(s) with no decision", ""])
