"""Hourly features using only information available at that hour: charted values (forward-filled),
lab values only after their RESULT hour, slopes, measurement counts and simple composite scores."""

from __future__ import annotations

import numpy as np
import pandas as pd

VITALS = ["hr", "sbp", "rr", "temp", "spo2"]
FEATURES = (["hr", "sbp", "rr", "temp", "spo2", "lactate", "lactate_slope_6h", "hr_slope_3h", "rr_slope_3h",
             "sbp_slope_3h", "n_vitals_4h", "hours_since_vital", "sirs_like", "qsofa_like", "sirs_drift_3h"])


def _slope(s: pd.Series, k: int) -> pd.Series:
    return (s - s.shift(k)) / k


def patient_features(g: pd.DataFrame) -> pd.DataFrame:
    g = g.sort_values("hour").reset_index(drop=True)
    f = pd.DataFrame({"pid": g.pid, "hour": g.hour})
    obs = g[VITALS].notna()
    for c in VITALS:
        f[c] = g[c].ffill()
    # a lab is usable only once its result is back: place it at its result hour, then carry it forward
    lab = pd.Series(np.nan, index=g.index)
    for val, rh in zip(g.lactate_value.to_numpy(), g.lactate_result_hour.to_numpy()):
        if not np.isnan(val) and rh < len(g):
            lab.iloc[int(rh)] = val if np.isnan(lab.iloc[int(rh)]) else max(lab.iloc[int(rh)], val)
    f["lactate"] = lab.ffill()
    f["lactate_slope_6h"] = _slope(f["lactate"], 6)
    for c in ("hr", "rr", "sbp"):
        f[f"{c}_slope_3h"] = _slope(f[c], 3)
    f["n_vitals_4h"] = obs.sum(axis=1).rolling(4, min_periods=1).sum()  # how many readings in the last 4 h
    last = np.where(obs.any(axis=1), g.hour, np.nan)
    f["hours_since_vital"] = g.hour - pd.Series(last).ffill()
    f["sirs_like"] = ((f.hr > 90).astype(int) + (f.rr > 20) + (f.temp > 38.0) + (f.temp < 36.0)).astype(int)
    f["qsofa_like"] = ((f.rr >= 22).astype(int) + (f.sbp <= 100)).astype(int)
    f["sirs_drift_3h"] = f.sirs_like - f.sirs_like.shift(3)
    return f


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    parts = [patient_features(g) for _, g in df.groupby("pid", sort=True)]
    f = pd.concat(parts, ignore_index=True)
    keys = df[["pid", "hour", "y_next6h", "censored", "onset_hour", "sepsis"]]
    return f.merge(keys, on=["pid", "hour"], how="left")


def mews_like(f: pd.DataFrame) -> pd.Series:
    """Fixed-threshold early warning score: the baseline every learned model has to beat."""
    s = (np.select([f.hr > 130, f.hr > 110, f.hr > 100, f.hr < 50], [3, 2, 1, 2], 0)
         + np.select([f.rr > 29, f.rr > 20, f.rr > 14, f.rr < 9], [3, 2, 1, 2], 0)
         + np.select([f.sbp < 70, f.sbp < 81, f.sbp < 101], [3, 2, 1], 0)
         + np.select([f.temp > 38.5, f.temp < 35.0], [2, 2], 0))
    return pd.Series(s, index=f.index).astype(float)
