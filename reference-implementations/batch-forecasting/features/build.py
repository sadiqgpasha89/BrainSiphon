"""Origin-safe feature construction, used identically by the backtest (training) and by the nightly forecast run (serving).

Everything is computed from sales on or before the forecast origin, plus the promotion plan, which the business publishes
weeks ahead. Demand on a stock-out day is censored (recorded sales understate it), so those days are excluded from the level,
from the lag means and from the training targets.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

import numpy as np
import pandas as pd
from sqlalchemy import select

from data import schema


@dataclass
class Panel:
    series: list[tuple[str, str]]
    days: list[date]              # contiguous calendar, first observed day .. last observed day + horizon
    units: np.ndarray             # [series, day], NaN where the source has not reported
    stockout: np.ndarray          # [series, day] bool
    promo: np.ndarray             # [series, day] bool, from the promotion plan (covers future days)
    last_observed: int            # index of the newest day with any sales row

    def completeness(self, idx: int) -> float:
        return float(np.mean(~np.isnan(self.units[:, idx])))


def load_panel(conn, horizon: int) -> Panel:
    rows = conn.execute(select(schema.sales_daily.c.store_id, schema.sales_daily.c.sku, schema.sales_daily.c.day,
                               schema.sales_daily.c.units, schema.sales_daily.c.stockout)).all()
    if not rows:
        raise ValueError("no sales have been ingested")
    series = sorted({(r[0], r[1]) for r in rows})
    sidx = {s: i for i, s in enumerate(series)}
    first, last = date.fromisoformat(min(r[2] for r in rows)), date.fromisoformat(max(r[2] for r in rows))
    n_obs = (last - first).days + 1
    days = [first + timedelta(days=i) for i in range(n_obs + horizon)]
    units = np.full((len(series), len(days)), np.nan)
    stockout = np.zeros(units.shape, dtype=bool)
    promo = np.zeros(units.shape, dtype=bool)
    for store, sku, day, u, so in rows:
        j = (date.fromisoformat(day) - first).days
        units[sidx[(store, sku)], j] = u
        stockout[sidx[(store, sku)], j] = bool(so)
    for store, sku, day in conn.execute(select(schema.promo_plan)).all():
        j = (date.fromisoformat(day) - first).days
        if (store, sku) in sidx and 0 <= j < len(days):
            promo[sidx[(store, sku)], j] = True
    return Panel(series, days, units, stockout, promo, n_obs - 1)


def _nanmean(a: np.ndarray, axis: int = 1) -> np.ndarray:
    n = np.sum(~np.isnan(a), axis=axis)
    return np.where(n > 0, np.nansum(a, axis=axis) / np.maximum(n, 1), np.nan)


def build(panel: Panel, origin: int, horizon: int, names: list[str]) -> pd.DataFrame:
    """One row per (series, horizon) for the forecast made at the end of day `origin` (an index into panel.days)."""
    if origin < 35:
        raise ValueError("at least 35 days of history are needed before the origin")
    clean = np.where(panel.stockout, np.nan, panel.units)  # demand we can trust
    w28 = clean[:, origin - 27 : origin + 1]
    level = _nanmean(w28)
    level = np.where(np.isnan(level) | (level <= 0), np.nan, level)
    last7 = _nanmean(clean[:, origin - 6 : origin + 1])
    frames = []
    for h in range(1, horizon + 1):
        t = origin + h
        lag = 7 * int(np.ceil(h / 7))  # the newest same-weekday day that is on or before the origin
        naive = clean[:, t - lag]
        same_dow = _nanmean(np.stack([clean[:, t - lag - 7 * j] for j in range(4)], axis=1))
        doy = panel.days[t].timetuple().tm_yday
        actual = panel.units[:, t] if t <= panel.last_observed else np.full(len(panel.series), np.nan)
        censored = panel.stockout[:, t] if t <= panel.last_observed else np.zeros(len(panel.series), dtype=bool)
        frames.append(pd.DataFrame({
            "store_id": [s[0] for s in panel.series], "sku": [s[1] for s in panel.series],
            "origin_day": str(panel.days[origin]), "target_day": str(panel.days[t]),
            "level": level, "baseline": np.where(np.isnan(naive), np.where(np.isnan(same_dow), level, same_dow), naive),
            "actual": actual, "censored": censored,
            "horizon": float(h), "target_dow": float(panel.days[t].weekday()), "target_on_promo": panel.promo[:, t].astype(float),
            "seasonal_naive_ratio": naive / level, "same_dow_mean_ratio": same_dow / level, "last7_ratio": last7 / level,
            "promo_share_28d": panel.promo[:, origin - 27 : origin + 1].mean(axis=1),
            "stockout_share_28d": panel.stockout[:, origin - 27 : origin + 1].mean(axis=1),
            "log_level": np.log1p(level), "year_sin": np.sin(2 * np.pi * doy / 365.25), "year_cos": np.cos(2 * np.pi * doy / 365.25),
        }))
    out = pd.concat(frames, ignore_index=True)
    out = out[~out["level"].isna()].reset_index(drop=True)  # a series with no trustworthy recent sales cannot be forecast
    assert list(out.columns[8:]) == names, "features/build.py and features/definitions.yaml disagree"
    return out
