"""Train, backtest, package, register and (if every gate holds) promote.

    python -m training.train

Rolling forecast origins, one per week. The newest `test_origins` origins are held out; the four before them calibrate the
width of the prediction band; training origins end early enough that no training TARGET falls inside the calibration or
test period. The candidate must beat the seasonal-naive baseline (forecast value added), keep its band coverage in range and
not regress against the production model on the same held-out origins.
"""

from __future__ import annotations

import json
from typing import Any

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor

from bsref import db, drift, featurestore
from bsref.config import load_yaml, settings
from bsref.registry import Registry, RegistryError, data_hash
from bsref.validation import DataValidationError
from features.build import Panel, build, load_panel
from serving.model import ForecastModel

CAL_ORIGINS = 4


def wape(actual: np.ndarray, forecast: np.ndarray) -> float:
    return float(np.abs(actual - forecast).sum() / max(actual.sum(), 1e-9))


def frames(panel: Panel, origins: list[int], horizon: int, names: list[str]) -> pd.DataFrame:
    df = pd.concat([build(panel, o, horizon, names) for o in origins], ignore_index=True)
    df = df[~df["actual"].isna() & ~df["censored"]]  # no target yet, or a censored one: neither can be scored
    return df.dropna(subset=names).reset_index(drop=True)


def measure(model: ForecastModel, df: pd.DataFrame) -> dict[str, float]:
    p, a = model.predict(df), df["actual"].to_numpy(dtype=float)
    base = wape(a, df["baseline"].to_numpy(dtype=float))
    out = {
        "wape": wape(a, p["p50"].to_numpy()), "baseline_wape": base,
        "bias": float((p["p50"].to_numpy() - a).sum() / max(a.sum(), 1e-9)),
        "coverage_p10_p90": float(((a >= p["p10"].to_numpy()) & (a <= p["p90"].to_numpy())).mean()),
        "rows": float(len(df)),
    }
    out["forecast_value_added"] = 1 - out["wape"] / base
    for name, mask in (("wape_h1_7", df["horizon"] <= 7), ("wape_h8_14", df["horizon"] > 7)):
        out[name] = wape(a[mask.to_numpy()], p["p50"].to_numpy()[mask.to_numpy()])
    promo = df["target_on_promo"].to_numpy() == 1
    if promo.sum() > 20:
        out["wape_promo_days"] = wape(a[promo], p["p50"].to_numpy()[promo])
    return out


def gate(metrics: dict[str, float], production_wape: float | None, cfg: dict[str, Any]) -> list[str]:
    g, fails = cfg["gates"], []
    if metrics["forecast_value_added"] < g["min_forecast_value_added"]:
        fails.append(f"forecast value added {metrics['forecast_value_added']:.3f} < {g['min_forecast_value_added']}")
    lo, hi = g["coverage_range"]
    if not lo <= metrics["coverage_p10_p90"] <= hi:
        fails.append(f"band coverage {metrics['coverage_p10_p90']:.3f} outside [{lo}, {hi}]")
    if production_wape is not None and metrics["wape"] > production_wape + g["max_regression_vs_production"]:
        fails.append(f"WAPE {metrics['wape']:.3f} regresses against production {production_wape:.3f} on the same origins")
    return fails


def origins_for(panel: Panel, cfg: dict[str, Any]) -> tuple[list[int], list[int], list[int]]:
    h, step, b = cfg["horizon_days"], cfg["backtest"]["origin_step_days"], cfg["backtest"]
    newest = panel.last_observed - h  # the newest origin whose whole horizon has actuals
    test = [newest - step * i for i in range(b["test_origins"])][::-1]
    cal = [test[0] - step * (i + 1) for i in range(CAL_ORIGINS)][::-1]
    last_train = cal[0] - h  # every training target is on or before the first calibration origin
    train = [last_train - step * i for i in range(b["train_origins"]) if last_train - step * i >= 35][::-1]
    return train, cal, test


def run(by: str = "pipeline") -> dict[str, Any]:
    cfg = load_yaml("configs/pipeline.yaml")
    names, h = featurestore.feature_names(cfg["feature_view"]), cfg["horizon_days"]
    with db.tx() as conn:
        panel = load_panel(conn, h)
    train_o, cal_o, test_o = origins_for(panel, cfg)
    if len(train_o) < 8:
        raise DataValidationError("fewer than 8 training origins: not enough history to backtest")
    train, cal, test = (frames(panel, o, h, names) for o in (train_o, cal_o, test_o))
    X, y = train[names].to_numpy(dtype=float), (train["actual"] / train["level"]).to_numpy(dtype=float)
    params = {"max_iter": 250, "learning_rate": 0.06, "max_leaf_nodes": 31, "min_samples_leaf": 40, "l2_regularization": 1.0,
              "random_state": 0}
    models = {name: HistGradientBoostingRegressor(loss="quantile", quantile=q, **params).fit(X, y)
              for name, q in (("p10", 0.1), ("p50", 0.5), ("p90", 0.9))}
    model = ForecastModel(models, names)
    # calibrate the band width on origins the model has not seen, so that p10..p90 really holds about 80% of outcomes
    best = min(np.arange(0.6, 2.01, 0.05), key=lambda s: abs(measure(ForecastModel(models, names, float(s)), cal)["coverage_p10_p90"] - 0.80))
    model.band_scale = round(float(best), 2)
    metrics = measure(model, test)

    registry = Registry(settings().registry_dir)
    prod_wape = prod_version = None
    try:
        prod, prod_manifest = registry.load(cfg["model_name"])
        if prod.features == names:
            prod_wape, prod_version = measure(prod, test)["wape"], prod_manifest["version"]
    except RegistryError:
        pass
    version = registry.register(
        cfg["model_name"], model, metrics={k: round(v, 5) for k, v in metrics.items()},
        params={"algorithm": "quantile_gradient_boosting", **params}, features=names,
        training_data_hash=data_hash(len(train), str(panel.days[train_o[0]]), str(panel.days[test_o[-1]]), names),
        extra={
            "origins": {"train": [str(panel.days[train_o[0]]), str(panel.days[train_o[-1]])],
                        "calibration": [str(panel.days[cal_o[0]]), str(panel.days[cal_o[-1]])],
                        "test": [str(panel.days[test_o[0]]), str(panel.days[test_o[-1]])]},
            "rows": {"train": len(train), "calibration": len(cal), "test": len(test)},
            "band_scale": model.band_scale,
            "trained_through": str(panel.days[panel.last_observed]),
            "production_at_training": {"version": prod_version, "wape_same_origins": prod_wape},
            "drift_reference": {n: drift.reference_bins(train[n].to_numpy(dtype=float)) for n in names},
        },
    )
    fails = gate(metrics, prod_wape, cfg)
    promoted = False
    if not fails and cfg["gates"]["auto_promote"]:
        registry.promote(cfg["model_name"], version, by=by, reason="all promotion gates passed")
        promoted = True
    with db.tx() as conn:
        db.audit(conn, by, "model.train", f"{cfg['model_name']}/{version}", {"promoted": promoted, "failed_gates": fails})
    return {"version": version, "promoted": promoted, "failed_gates": fails,
            "rows": {"train": len(train), "calibration": len(cal), "test": len(test)},
            "test_origins": [str(panel.days[test_o[0]]), str(panel.days[test_o[-1]])], "band_scale": model.band_scale,
            "test_metrics": {k: round(v, 4) for k, v in metrics.items()}, "production_wape_same_origins": prod_wape}


if __name__ == "__main__":
    db.init_schema()
    print(json.dumps(run(), indent=2))
