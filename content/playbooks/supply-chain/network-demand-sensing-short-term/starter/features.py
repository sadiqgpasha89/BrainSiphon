"""Forecast-origin features. A row is (series, origin day t, horizon h): everything on it was known at the
end of day t. The target is sales on day t+h divided by the series' recent average, so one model serves all
series."""

from __future__ import annotations

import numpy as np
import pandas as pd

HORIZONS = (1, 3, 7, 14)
FEATURES = ["h", "dow_target", "mean_7", "mean_28", "momentum", "lag_same_dow_1", "lag_same_dow_2", "promo_target",
            "ext_target", "prebooked_ratio", "missing_7", "last_constrained"]


def series_arrays(g: pd.DataFrame, last_day_missing: bool = False) -> dict:
    sales = g.sales.to_numpy(dtype=float).copy()
    return {"sales": sales, "promo": g.promo.to_numpy(), "ext": g.ext_signal.to_numpy(), "cons": g.constrained.to_numpy(),
            "booked": g[[f"prebooked_{h}" for h in range(1, 15)]].to_numpy(), "n": len(g)}


def origin_rows(a: dict, origins: list[int], horizons=HORIZONS, late_feed: bool = False, zero_fill: bool = False):
    """One row per (origin, horizon). If late_feed, the most recent day of POS is missing at the origin:
    either read as zero (the trap) or left missing (what a careful pipeline does)."""
    rows = []
    for t in origins:
        hist = a["sales"][: t + 1].copy()
        if late_feed:
            hist[-1] = 0.0 if zero_fill else np.nan
        m7, m28 = np.nanmean(hist[-7:]), np.nanmean(hist[-28:])
        scale = max(np.nanmean(hist[-28:]), 1.0)
        for h in horizons:
            if t + h >= a["n"]:
                continue
            target_day = t + h
            same = [hist[target_day - 7 * k] if target_day - 7 * k <= t else np.nan for k in range(1, 4)]
            lag1 = next((hist[target_day - 7 * k] for k in range(1, 6) if target_day - 7 * k <= t), np.nan)
            lag2 = next((hist[target_day - 7 * k] for k in range(2, 7) if target_day - 7 * k <= t), np.nan)
            booked = a["booked"][t, h - 1]
            rows.append({"t": t, "h": h, "dow_target": target_day % 7, "mean_7": m7 / scale, "mean_28": m28,
                         "momentum": m7 / max(m28, 1e-6), "lag_same_dow_1": lag1 / scale, "lag_same_dow_2": lag2 / scale,
                         "promo_target": a["promo"][target_day], "ext_target": a["ext"][target_day],
                         "prebooked_ratio": booked / scale, "missing_7": float(np.isnan(hist[-7:]).sum()),
                         "last_constrained": a["cons"][max(t - 6, 0): t + 1].max(), "scale": scale,
                         "base_same_dow": np.nanmean(same) if not np.all(np.isnan(same)) else np.nan,
                         "y": a["sales"][target_day], "y_scaled": a["sales"][target_day] / scale,
                         "target_constrained": a["cons"][target_day]})
    return rows


def build_table(df: pd.DataFrame, first_origin: int = 60, step: int = 7, **kw) -> pd.DataFrame:
    out = []
    for sid, g in df.groupby("sid", sort=True):
        a = series_arrays(g.sort_values("day"))
        r = pd.DataFrame(origin_rows(a, list(range(first_origin, a["n"] - 1, step)), **kw))
        r.insert(0, "sid", sid)
        out.append(r)
    return pd.concat(out, ignore_index=True)
