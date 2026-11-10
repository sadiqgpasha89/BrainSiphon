"""Synthetic card-authorisation stream with the traps the blueprint warns about.

What is simulated (all knobs are arguments):
  * genuine cardholders with diurnal spending, a primary device and Zipf-distributed merchants
  * genuine shopping sessions (several purchases in minutes) that look like velocity but are not fraud
  * compromised cards: a fast cash-out burst from shared "mule" devices, or a quiet takeover on the genuine device
  * a few genuine flash sales: merchant-level spikes that must NOT be flagged (false-positive pressure)
  * delayed labels: fraud is only *reported* after the event, so recent rows look clean

Two label contracts share one stream (`mode`), because the payment rails confirm fraud differently:
  * "card": a chargeback arrives 7-21 days after the event and every fraud is eventually labelled
    (21 days is a compressed stand-in for the real 30-90 day window).
  * "upi": there is no chargeback. The payer complains, or the beneficiary bank recovers or freezes funds, within about a
    week; some fraud is never reported and so never becomes a positive label.

Time is float seconds from t0; `label_ts` is when the row's label becomes known. `is_fraud` is the simulation's ground truth
(only a synthetic set has one); `label` is what the label process would reveal; `label_source` says where it came from.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

DAY = 86_400.0
LABEL_MATURITY_DAYS = 21  # compressed stand-in for the 30-90 day chargeback window (card)
UPI_MATURITY_DAYS = 7  # complaint and recovery window (UPI)
UPI_REPORTED_SHARE = 0.78  # the rest of UPI fraud is never reported, so it is never a positive label
MODES = ("card", "upi")


def maturity_days(mode: str) -> int:
    return {"card": LABEL_MATURITY_DAYS, "upi": UPI_MATURITY_DAYS}[mode]


def generate(n_cards: int = 2500, days: int = 120, seed: int = 7, fraud_card_rate: float = 0.03,
             n_merchants: int = 600, n_flash_sales: int = 6, mode: str = "card") -> pd.DataFrame:
    if mode not in MODES:
        raise ValueError(f"mode must be one of {MODES}, got {mode!r}")
    rng = np.random.default_rng(seed)
    n_devices = int(n_cards * 1.1)
    mule_devices = np.arange(n_devices, n_devices + 40)  # shared across many fraud cards
    risky_merchants = rng.choice(n_merchants, size=n_merchants // 20, replace=False)

    zipf = 1.0 / np.arange(1, n_merchants + 1) ** 0.9
    zipf /= zipf.sum()
    hour_p = np.array([1, 1, 1, 1, 1, 2, 3, 5, 6, 6, 6, 7, 8, 7, 6, 6, 7, 8, 9, 9, 8, 6, 4, 2], float)
    hour_p /= hour_p.sum()

    rows: list[pd.DataFrame] = []

    # --- genuine traffic -------------------------------------------------------------------
    rate = rng.lognormal(mean=-0.7, sigma=0.6, size=n_cards)  # transactions per day per card
    counts = rng.poisson(rate * days)
    card = np.repeat(np.arange(n_cards), counts)
    day = rng.uniform(0, days, size=card.size).astype(int)
    hour = rng.choice(24, size=card.size, p=hour_p)
    ts = day * DAY + hour * 3600 + rng.uniform(0, 3600, size=card.size)
    primary = rng.integers(0, n_devices, size=n_cards)
    device = np.where(rng.random(card.size) < 0.92, primary[card], rng.integers(0, n_devices, size=card.size))
    spend = rng.lognormal(mean=3.2, sigma=0.35, size=n_cards)
    amount = np.round(rng.lognormal(np.log(spend[card]), 0.8), 2)
    merchant = rng.choice(n_merchants, size=card.size, p=zipf)
    rows.append(pd.DataFrame({"ts": ts, "card": card, "device": device, "merchant": merchant,
                              "amount": amount, "is_fraud": 0}))

    # --- genuine flash sales: many ordinary cards hit one merchant within an hour ------------
    for _ in range(n_flash_sales):
        m = int(rng.integers(0, n_merchants))
        start = rng.uniform(10 * DAY, (days - 1) * DAY)
        k = int(rng.integers(300, 600))
        cards = rng.integers(0, n_cards, size=k)
        rows.append(pd.DataFrame({"ts": start + rng.uniform(0, 3600, size=k), "card": cards,
                                  "device": primary[cards], "merchant": m,
                                  "amount": np.round(rng.lognormal(3.6, 0.5, size=k), 2), "is_fraud": 0}))

    # --- genuine shopping sessions: 5% of cards sometimes buy 4-9 things within minutes -----
    for c in rng.choice(n_cards, size=int(n_cards * 0.05), replace=False):
        for _ in range(int(days / 10)):
            k = int(rng.integers(4, 10))
            start = rng.uniform(0, (days - 1) * DAY)
            rows.append(pd.DataFrame({"ts": start + rng.uniform(0, 900, size=k), "card": c, "device": primary[c],
                                      "merchant": rng.choice(n_merchants, size=k, p=zipf),
                                      "amount": np.round(rng.lognormal(np.log(spend[c]), 0.7, size=k), 2),
                                      "is_fraud": 0}))

    # --- compromised cards: two attack styles, one of them quiet -----------------------------
    n_fraud_cards = max(1, int(n_cards * fraud_card_rate))
    for c in rng.choice(n_cards, size=n_fraud_cards, replace=False):
        start = rng.uniform(5 * DAY, (days - 0.5) * DAY)
        takeover = rng.random() < 0.4  # account takeover on the genuine device: slow, few, ordinary merchants
        k = int(rng.integers(3, 9)) if takeover else int(rng.integers(6, 22))
        gaps = rng.uniform(60, 900, size=k).cumsum() if takeover else rng.uniform(20, 240, size=k).cumsum()
        merch = rng.choice(n_merchants, size=k, p=zipf) if takeover else rng.choice(risky_merchants, size=k)
        rows.append(pd.DataFrame({
            "ts": start + gaps, "card": c, "device": primary[c] if takeover else rng.choice(mule_devices),
            "merchant": merch, "amount": np.round(rng.lognormal(np.log(spend[c]) + (0.6 if takeover else 1.0), 0.5, size=k), 2),
            "is_fraud": 1}))

    tx = pd.concat(rows, ignore_index=True).sort_values("ts", kind="mergesort").reset_index(drop=True)
    tx = tx[tx["ts"] < days * DAY].reset_index(drop=True)
    tx["txn_id"] = np.arange(len(tx))
    if mode == "card":
        # the draw order is unchanged from the single-rail version, so card data is bit-for-bit what it always was
        delay = rng.uniform(7, LABEL_MATURITY_DAYS, size=len(tx)) * DAY
        tx["label_ts"] = tx["ts"] + np.where(tx["is_fraud"] == 1, delay, LABEL_MATURITY_DAYS * DAY)
        tx["label"] = tx["is_fraud"]
        tx["label_source"] = np.where(tx["is_fraud"] == 1, "chargeback", "none")
    else:
        # a separate generator: choosing UPI labels must not disturb the transaction stream above
        lab = np.random.default_rng([seed, 17])
        reported = (tx["is_fraud"] == 1).to_numpy() & (lab.random(len(tx)) < UPI_REPORTED_SHARE)
        days = np.clip(lab.lognormal(np.log(1.2), 0.9, size=len(tx)), 0.05, UPI_MATURITY_DAYS)
        recovered = lab.random(len(tx)) < 0.4  # funds frozen or recovered by the beneficiary bank, versus a payer complaint
        tx["label_ts"] = tx["ts"] + np.where(reported, days, UPI_MATURITY_DAYS) * DAY
        tx["label"] = reported.astype(int)
        tx["label_source"] = np.where(reported, np.where(recovered, "recovery", "complaint"), "none")
    return tx


def label_maturity_curve(df: pd.DataFrame, max_day: int = 30) -> np.ndarray:
    """Share of eventually-reported fraud whose label is known `d` days after the event, for d = 0..max_day."""
    pos = df[df["label"] == 1]
    lag = ((pos["label_ts"] - pos["ts"]) / DAY).to_numpy()
    return np.array([(lag <= d + 1e-9).mean() for d in range(max_day + 1)])


if __name__ == "__main__":
    import sys

    mode = sys.argv[1] if len(sys.argv) > 1 else "card"
    df = generate(mode=mode)
    df.to_csv("transactions.csv", index=False)
    silent = ((df.is_fraud == 1) & (df.label == 0)).sum() / max(1, (df.is_fraud == 1).sum())
    print(f"[{mode}] {len(df):,} rows, fraud rate {df.is_fraud.mean():.3%}, never-reported fraud {silent:.0%}, "
          f"{df.card.nunique():,} cards, {df.device.nunique():,} devices -> transactions.csv")
