"""Synthetic ad-impression log with the traps from the blueprint.

  * position bias: the old ranker puts good ads on top, so logged CTR confounds quality with position
  * a small RANDOMISED slice (3% of traffic) with uniformly random positions = the only unbiased evaluation set
  * cold start: new ads launch throughout the 30 days, so the test week contains ads with no history
  * accidental taps: about 2% of clicks are mobile-banner mis-taps that end in under half a second
  * sparse categoricals: hundreds of ads, dozens of advertisers, user segments and categories
Fields: ts (hours from t0), user, seg, ad, advertiser, category, placement, device, hour, position, click, dwell_ms,
`true_p` is the generating click probability: a luxury of synthetic data that lets you measure bias exactly.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

EXAM = np.array([1.0, 0.72, 0.52, 0.38, 0.28])          # chance a user even looks at position 1..5
PLACEMENTS = ["feed", "sidebar", "banner"]
PLACEMENT_EFFECT = np.array([0.25, -0.45, -0.15])


def sigmoid(x):
    return 1 / (1 + np.exp(-x))


def generate(n_impressions: int = 300_000, days: int = 30, n_ads: int = 700, n_users: int = 20_000, seed: int = 5,
             explore_share: float = 0.03) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    n_adv, n_cat, n_seg = 60, 12, 8
    advertiser = rng.integers(0, n_adv, n_ads)
    category = rng.integers(0, n_cat, n_ads)
    quality = rng.normal(0, 0.45, n_ads) + rng.normal(0, 0.3, n_adv)[advertiser]
    launch = np.where(rng.random(n_ads) < 0.45, 0, rng.uniform(0, days * 24 * 0.85, n_ads))   # hours
    affinity = rng.normal(0, 0.7, (n_seg, n_cat))
    seg = rng.integers(0, n_seg, n_users)

    ts = np.sort(rng.uniform(0, days * 24, n_impressions))
    user = rng.integers(0, n_users, n_impressions)
    hour = (ts % 24).astype(int)
    placement = rng.choice(3, n_impressions, p=[0.55, 0.15, 0.30])
    device = rng.choice(2, n_impressions, p=[0.35, 0.65])                    # 0 desktop, 1 mobile

    # candidate ad: uniform over ads already launched at that time
    ad = np.empty(n_impressions, dtype=int)
    for i in range(n_impressions):
        live = np.flatnonzero(launch <= ts[i])
        ad[i] = rng.choice(live)
    # the OLD ranker: position depends on a noisy estimate of quality, so good ads sit on top
    old_score = quality[ad] + rng.normal(0, 0.5, n_impressions)
    position = np.clip(np.digitize(-old_score, np.quantile(-old_score, [0.2, 0.4, 0.6, 0.8])), 0, 4)
    explore = rng.random(n_impressions) < explore_share
    position = np.where(explore, rng.integers(0, 5, n_impressions), position)

    logit = (-3.3 + quality[ad] + affinity[seg[user], category[ad]] + PLACEMENT_EFFECT[placement]
             + 0.25 * device + 0.12 * np.sin((hour - 6) / 24 * 2 * np.pi))
    p_click = sigmoid(logit) * EXAM[position]
    click = (rng.random(n_impressions) < p_click).astype(int)
    accidental = (click == 0) & (device == 1) & (placement == 2) & (rng.random(n_impressions) < 0.0045)
    click = np.where(accidental, 1, click)
    dwell = np.where(click == 1, np.where(accidental, rng.integers(60, 450, n_impressions), rng.integers(900, 20_000, n_impressions)), 0)
    return pd.DataFrame({"ts": ts, "user": user, "seg": seg[user], "ad": ad, "advertiser": advertiser[ad],
                         "category": category[ad], "placement": placement, "device": device, "hour": hour,
                         "position": position + 1, "click": click, "dwell_ms": dwell, "explore": explore.astype(int),
                         "true_p": p_click})


if __name__ == "__main__":
    df = generate()
    df.to_csv("impressions.csv", index=False)
    print(f"{len(df):,} impressions, CTR {df.click.mean():.2%}, ads {df.ad.nunique()}, "
          f"accidental-tap-like clicks {((df.click == 1) & (df.dwell_ms < 500)).sum()}")
