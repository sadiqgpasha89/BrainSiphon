"""The ONE implementation of the feature logic, used by streaming ingestion, by the online scoring path and by the offline
backfill. Training/serving skew cannot appear because there is no second implementation to drift.

`compute` reads the entity states as they were the instant BEFORE the transaction; `update` then folds the transaction in.
A feature therefore never contains the transaction it describes, or anything after it (no leakage).
"""

from __future__ import annotations

import math
from typing import Any

DAY = 86400.0
GAP_CAP = 30 * DAY
MERCHANT_PRIOR_N = 30.0  # smoothing: a merchant with 3 transactions and 1 chargeback is not "33% fraud"
MERCHANT_HALF_LIFE = 14 * DAY  # merchant counts decay, so the rate describes the recent weeks and stays stationary
CARD_AGE_CAP = 10.0  # an unbounded lifetime counter grows for ever, so it would drift by construction: cap it


def new_card() -> dict[str, Any]:
    return {"n": 0, "avg": 0.0, "last": None, "recent": [], "merch": [], "dev": [], "country": None}


def new_device() -> dict[str, Any]:
    return {"cards": {}}


def new_merchant() -> dict[str, Any]:
    return {"n": 0.0, "cb": 0.0, "t": None}


def _decayed(merchant: dict[str, Any], t: float) -> tuple[float, float]:
    """The merchant's transaction and chargeback counts as of time t, exponentially decayed."""
    if merchant["t"] is None:
        return 0.0, 0.0
    k = 0.5 ** (max(t - merchant["t"], 0.0) / MERCHANT_HALF_LIFE)
    return merchant["n"] * k, merchant["cb"] * k


def compute(txn: dict[str, Any], card: dict[str, Any], device: dict[str, Any], merchant: dict[str, Any]) -> dict[str, float]:
    t, amount = float(txn["event_time"]), float(txn["amount"])
    recent = [(tt, a) for tt, a in card["recent"] if 0 <= t - tt <= DAY]
    m_n, m_cb = _decayed(merchant, t)
    other_cards = sum(1 for c, tt in device["cards"].items() if c != str(txn["card_id"]) and t - tt <= 7 * DAY)
    return {
        "amount": amount,
        "log_amount": math.log1p(amount),
        "card_txn_count_1h": float(sum(1 for tt, _ in recent if t - tt <= 3600)),
        "card_txn_count_24h": float(len(recent)),
        "card_amount_sum_24h": float(sum(a for _, a in recent)),
        "amount_to_card_avg_ratio": amount / card["avg"] if card["n"] and card["avg"] > 0 else 1.0,
        "secs_since_last_txn": min(max(t - card["last"], 0.0), GAP_CAP) if card["last"] is not None else GAP_CAP,
        "is_new_merchant_for_card": float(txn["merchant_id"] not in card["merch"]),
        "is_new_device_for_card": float(txn["device_id"] not in card["dev"]),
        "device_distinct_cards_7d": float(other_cards),
        "merchant_chargeback_rate": m_cb / (m_n + MERCHANT_PRIOR_N),
        "card_txn_total": min(float(card["n"]), CARD_AGE_CAP),
        "rail_is_upi": float(txn["rail"] == "upi"),
        "hour_of_day": float(int(t % DAY // 3600)),
        "country_mismatch": float(card["country"] is not None and txn["country"] != card["country"]),
    }


def update(txn: dict[str, Any], card: dict[str, Any], device: dict[str, Any], merchant: dict[str, Any]) -> None:
    t, amount = float(txn["event_time"]), float(txn["amount"])
    card["avg"] = amount if card["n"] == 0 else 0.9 * card["avg"] + 0.1 * amount
    card["n"] += 1
    card["last"] = t if card["last"] is None else max(card["last"], t)
    card["recent"] = [[tt, a] for tt, a in card["recent"] if t - tt <= DAY][-49:] + [[t, amount]]
    if txn["merchant_id"] not in card["merch"]:
        card["merch"] = (card["merch"] + [txn["merchant_id"]])[-60:]
    if txn["device_id"] not in card["dev"]:
        card["dev"] = (card["dev"] + [txn["device_id"]])[-6:]
    card["country"] = card["country"] or txn["country"]
    cards = {c: tt for c, tt in device["cards"].items() if t - tt <= 7 * DAY}
    cards[str(txn["card_id"])] = t
    device["cards"] = dict(sorted(cards.items(), key=lambda kv: kv[1])[-80:])
    n, cb = _decayed(merchant, t)
    merchant.update(n=n + 1.0, cb=cb, t=t if merchant["t"] is None else max(merchant["t"], t))


def on_chargeback(merchant: dict[str, Any], t: float) -> None:
    n, cb = _decayed(merchant, t)
    merchant.update(n=n, cb=cb + 1.0, t=t if merchant["t"] is None else max(merchant["t"], t))


NEW = {"card": new_card, "device": new_device, "merchant": new_merchant}
