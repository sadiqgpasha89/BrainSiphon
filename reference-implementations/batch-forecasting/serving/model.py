"""The packaged model: three quantile regressors (p10, p50, p90) on demand divided by the series level."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
import pandas as pd


@dataclass
class ForecastModel:
    quantile_models: dict[str, Any]  # "p10" | "p50" | "p90" -> regressor
    features: list[str]
    band_scale: float = 1.0          # widens or narrows the band so that p10..p90 covers 80% on the calibration origins

    def predict(self, frame: pd.DataFrame) -> pd.DataFrame:
        """Units forecasts for rows produced by features.build.build: non-negative and ordered p10 <= p50 <= p90."""
        X = frame[self.features].to_numpy(dtype=float)
        level = frame["level"].to_numpy(dtype=float)
        q = np.stack([self.quantile_models[k].predict(X) for k in ("p10", "p50", "p90")], axis=1)
        q = np.sort(np.clip(q, 0.0, None), axis=1)
        lo = q[:, 1] - (q[:, 1] - q[:, 0]) * self.band_scale
        hi = q[:, 1] + (q[:, 2] - q[:, 1]) * self.band_scale
        return pd.DataFrame({"p10": np.clip(lo, 0, None) * level, "p50": q[:, 1] * level, "p90": hi * level}, index=frame.index)
