"""Features for CTR: hashed sparse crosses for the linear baseline, and point-in-time smoothed history
for the tree model. History for an impression only uses impressions that happened strictly before it."""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.feature_extraction import FeatureHasher

PRIOR_CTR, PRIOR_STRENGTH = 0.02, 60.0
HASH_BITS = 18


def hashed_matrix(df: pd.DataFrame, use_position: bool):
    """Sparse hashed one-hots and crosses; the hashing trick keeps memory flat however many ids appear."""
    toks = []
    for r in df[["ad", "advertiser", "category", "placement", "device", "hour", "seg", "position"]].itertuples(index=False):
        ad, adv, cat, pl, dev, hr, seg, pos = r
        t = [f"ad={ad}", f"adv={adv}", f"cat={cat}", f"pl={pl}", f"dev={dev}", f"hr={hr}", f"seg={seg}",
             f"ad_x_pl={ad}_{pl}", f"seg_x_cat={seg}_{cat}", f"adv_x_dev={adv}_{dev}"]
        if use_position:
            t.append(f"pos={pos}")
        toks.append(t)
    return FeatureHasher(n_features=2 ** HASH_BITS, input_type="string", alternate_sign=False).transform(toks)


def _smoothed_history(df: pd.DataFrame, keys: list[str]) -> tuple[np.ndarray, np.ndarray]:
    """Bayesian-smoothed CTR and impression count from rows strictly before each row (df sorted by ts)."""
    g = df.groupby(keys, sort=False)
    imps = g.cumcount().to_numpy().astype(float)                    # rows before this one in the group
    clicks = (g["click_clean"].cumsum() - df["click_clean"]).to_numpy().astype(float)
    return (clicks + PRIOR_CTR * PRIOR_STRENGTH) / (imps + PRIOR_STRENGTH), imps


def build_features(df: pd.DataFrame, drop_accidental: bool = True) -> pd.DataFrame:
    df = df.sort_values("ts", kind="mergesort").reset_index(drop=True).copy()
    accidental = (df.click == 1) & (df.dwell_ms < 500)
    df["click_clean"] = np.where(drop_accidental & accidental, 0, df.click)   # history ignores mis-taps
    df["ctr_ad"], df["imps_ad"] = _smoothed_history(df, ["ad"])
    df["ctr_ad_pl"], _ = _smoothed_history(df, ["ad", "placement"])
    df["ctr_adv"], _ = _smoothed_history(df, ["advertiser"])
    first_seen = df.groupby("ad")["ts"].transform("min")
    df["ad_age_h"] = df.ts - first_seen
    df["log_imps_ad"] = np.log1p(df["imps_ad"])
    return df


DENSE = ["ctr_ad", "ctr_ad_pl", "ctr_adv", "log_imps_ad", "ad_age_h", "placement", "device", "hour", "seg",
         "category", "position"]
