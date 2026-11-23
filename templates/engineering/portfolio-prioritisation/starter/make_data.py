"""Reference kit: event-level binary detection with delayed labels (fraud, abuse, default, churn, risk scoring).

A synthetic stream of events per entity (account, user, claim, device owner...) with the traps this paradigm always has:
  * genuine bursts that look like the signal (shopping sessions, flash sales) and must not be flagged
  * positives that arrive as a fast burst through a shared group (a shared device, address or counterparty), or as a quiet
    takeover on the entity's own group, which count features cannot see
  * delayed labels: positives are only *confirmed* 7-21 days after the event, so recent rows look clean
Time is float seconds from t0; `label_ts` is when the row's label becomes known.
Column names are deliberately generic: map `entity`, `group`, `counterparty`, `amount` onto your own fields.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

DAY = 86_400.0
LABEL_MATURITY_DAYS = 21  # compressed stand-in for the 30-90 day chargeback window


def generate(n_entities: int = 2500, days: int = 120, seed: int = 7, positive_entity_rate: float = 0.03,
             n_merchants: int = 600, n_flash_sales: int = 6) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    n_devices = int(n_entities * 1.1)
    mule_devices = np.arange(n_devices, n_devices + 40)  # shared across many fraud entities
    risky_merchants = rng.choice(n_merchants, size=n_merchants // 20, replace=False)

    zipf = 1.0 / np.arange(1, n_merchants + 1) ** 0.9
    zipf /= zipf.sum()
    hour_p = np.array([1, 1, 1, 1, 1, 2, 3, 5, 6, 6, 6, 7, 8, 7, 6, 6, 7, 8, 9, 9, 8, 6, 4, 2], float)
    hour_p /= hour_p.sum()

    rows: list[pd.DataFrame] = []

    # --- genuine traffic -------------------------------------------------------------------
    rate = rng.lognormal(mean=-0.7, sigma=0.6, size=n_entities)  # transactions per day per entity
    counts = rng.poisson(rate * days)
    entity = np.repeat(np.arange(n_entities), counts)
    day = rng.uniform(0, days, size=entity.size).astype(int)
    hour = rng.choice(24, size=entity.size, p=hour_p)
    ts = day * DAY + hour * 3600 + rng.uniform(0, 3600, size=entity.size)
    primary = rng.integers(0, n_devices, size=n_entities)
    group = np.where(rng.random(entity.size) < 0.92, primary[entity], rng.integers(0, n_devices, size=entity.size))
    spend = rng.lognormal(mean=3.2, sigma=0.35, size=n_entities)
    amount = np.round(rng.lognormal(np.log(spend[entity]), 0.8), 2)
    counterparty = rng.choice(n_merchants, size=entity.size, p=zipf)
    rows.append(pd.DataFrame({"ts": ts, "entity": entity, "group": group, "counterparty": counterparty,
                              "amount": amount, "label": 0}))

    # --- genuine flash sales: many ordinary entities hit one counterparty within an hour ------------
    for _ in range(n_flash_sales):
        m = int(rng.integers(0, n_merchants))
        start = rng.uniform(10 * DAY, (days - 1) * DAY)
        k = int(rng.integers(300, 600))
        entities = rng.integers(0, n_entities, size=k)
        rows.append(pd.DataFrame({"ts": start + rng.uniform(0, 3600, size=k), "entity": entities,
                                  "group": primary[entities], "counterparty": m,
                                  "amount": np.round(rng.lognormal(3.6, 0.5, size=k), 2), "label": 0}))

    # --- genuine shopping sessions: 5% of entities sometimes buy 4-9 things within minutes -----
    for c in rng.choice(n_entities, size=int(n_entities * 0.05), replace=False):
        for _ in range(int(days / 10)):
            k = int(rng.integers(4, 10))
            start = rng.uniform(0, (days - 1) * DAY)
            rows.append(pd.DataFrame({"ts": start + rng.uniform(0, 900, size=k), "entity": c, "group": primary[c],
                                      "counterparty": rng.choice(n_merchants, size=k, p=zipf),
                                      "amount": np.round(rng.lognormal(np.log(spend[c]), 0.7, size=k), 2),
                                      "label": 0}))

    # --- compromised entities: two attack styles, one of them quiet -----------------------------
    n_fraud_cards = max(1, int(n_entities * positive_entity_rate))
    for c in rng.choice(n_entities, size=n_fraud_cards, replace=False):
        start = rng.uniform(5 * DAY, (days - 0.5) * DAY)
        takeover = rng.random() < 0.4  # account takeover on the genuine group: slow, few, ordinary counterparty
        k = int(rng.integers(3, 9)) if takeover else int(rng.integers(6, 22))
        gaps = rng.uniform(60, 900, size=k).cumsum() if takeover else rng.uniform(20, 240, size=k).cumsum()
        merch = rng.choice(n_merchants, size=k, p=zipf) if takeover else rng.choice(risky_merchants, size=k)
        rows.append(pd.DataFrame({
            "ts": start + gaps, "entity": c, "group": primary[c] if takeover else rng.choice(mule_devices),
            "counterparty": merch, "amount": np.round(rng.lognormal(np.log(spend[c]) + (0.6 if takeover else 1.0), 0.5, size=k), 2),
            "label": 1}))

    tx = pd.concat(rows, ignore_index=True).sort_values("ts", kind="mergesort").reset_index(drop=True)
    tx = tx[tx["ts"] < days * DAY].reset_index(drop=True)
    tx["txn_id"] = np.arange(len(tx))
    delay = rng.uniform(7, LABEL_MATURITY_DAYS, size=len(tx)) * DAY
    tx["label_ts"] = tx["ts"] + np.where(tx["label"] == 1, delay, LABEL_MATURITY_DAYS * DAY)
    return tx


if __name__ == "__main__":
    df = generate()
    df.to_csv("transactions.csv", index=False)
    print(f"{len(df):,} rows, fraud rate {df.label.mean():.3%}, "
          f"{df.entity.nunique():,} entities, {df.group.nunique():,} devices -> transactions.csv")
