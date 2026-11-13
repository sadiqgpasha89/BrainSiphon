"""Train, evaluate, package, register and (if every gate holds) promote.

    python -m training.train

Steps: assemble matured labels -> validate the training set against its contract -> chronological split -> baseline
(logistic regression) and challenger (gradient boosting) -> calibrate on validation -> fit the ALLOW / STEP_UP / BLOCK
thresholds to the false-decline ceiling on validation -> keep whichever algorithm is better on validation -> measure
everything once on the untouched test window -> register
the packaged model with its lineage -> compare with the production model ON THE SAME TEST WINDOW -> promote or keep as candidate.
"""

from __future__ import annotations

import json
import logging
from typing import Any

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.isotonic import IsotonicRegression
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, brier_score_loss, roc_auc_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from bsref import db, drift, validation
from bsref.config import load_yaml, settings
from bsref.registry import Registry, RegistryError, data_hash
from serving.model import FraudModel
from training import dataset

log = logging.getLogger("training")


def threshold_at_fpr(scores: np.ndarray, y: np.ndarray, max_fpr: float) -> float:
    """The lowest threshold at which at most `max_fpr` of the genuine rows score at or above it.

    Calibrated scores are heavily tied, so the threshold is placed just above the first genuine score that may NOT be flagged;
    a tie can then never push the realised rate over the limit.
    """
    genuine = np.sort(scores[y == 0])
    allowed = int(np.floor(max_fpr * len(genuine)))
    if allowed >= len(genuine):
        return 0.0
    return float(np.nextafter(genuine[len(genuine) - allowed - 1], 2.0))


def measure(model: FraudModel, frame: pd.DataFrame) -> dict[str, float]:
    y = frame["label"].to_numpy()
    s = model.score(frame[model.features].to_numpy(dtype=float))
    block, step = s >= model.block_threshold, (s >= model.step_up_threshold) & (s < model.block_threshold)
    genuine, fraud = max(1, int((y == 0).sum())), max(1, int((y == 1).sum()))
    return {
        "pr_auc": float(average_precision_score(y, s)),
        "roc_auc": float(roc_auc_score(y, s)),
        "brier": float(brier_score_loss(y, s)),
        "recall_at_block": float((block & (y == 1)).sum() / fraud),
        "recall_at_step_up_or_block": float(((block | step) & (y == 1)).sum() / fraud),
        "false_decline_rate": float((block & (y == 0)).sum() / genuine),
        "step_up_rate": float((step & (y == 0)).sum() / genuine),
        "rows": float(len(frame)),
        "fraud_rows": float((y == 1).sum()),
    }


def gate(metrics: dict[str, float], production_pr_auc: float | None, cfg: dict[str, Any]) -> list[str]:
    """Returns the list of failed gates (empty = promote)."""
    g, fails = cfg["gates"], []
    if metrics["pr_auc"] < g["min_pr_auc"]:
        fails.append(f"pr_auc {metrics['pr_auc']:.3f} < {g['min_pr_auc']}")
    if metrics["recall_at_block"] < g["min_recall_at_block"]:
        fails.append(f"recall_at_block {metrics['recall_at_block']:.3f} < {g['min_recall_at_block']}")
    if metrics["false_decline_rate"] > g["max_false_decline_rate"]:
        fails.append(f"false_decline_rate {metrics['false_decline_rate']:.4f} > {g['max_false_decline_rate']}")
    if production_pr_auc is not None and metrics["pr_auc"] < production_pr_auc - g["max_regression_vs_production"]:
        fails.append(f"pr_auc {metrics['pr_auc']:.3f} regresses against production {production_pr_auc:.3f} on the same test window")
    return fails


def run(as_of: float | None = None, by: str = "pipeline") -> dict[str, Any]:
    cfg = load_yaml("configs/pipeline.yaml")
    with db.tx() as conn:
        as_of = as_of or dataset.watermark(conn)
        frame, names = dataset.build(conn, cfg, as_of)
    good, report = validation.validate_frame(load_yaml("data/contracts/training_set.yaml"), frame)
    report.raise_if_failed()
    train, val, test = dataset.split(good, cfg)
    if min(train["label"].sum(), val["label"].sum(), test["label"].sum()) < 5:
        raise validation.DataValidationError("fewer than 5 fraud rows in a split: not enough matured labels to train")
    X, y = train[names].to_numpy(dtype=float), train["label"].to_numpy()

    baseline = make_pipeline(StandardScaler(), LogisticRegression(max_iter=2000, class_weight="balanced")).fit(X, y)
    params = {"max_iter": 300, "learning_rate": 0.06, "max_leaf_nodes": 15, "l2_regularization": 1.0,
              "min_samples_leaf": 40, "class_weight": "balanced", "random_state": 0}
    clf = HistGradientBoostingClassifier(**params).fit(X, y)

    def package(estimator: Any) -> FraudModel:
        raw = estimator.predict_proba(val[names].to_numpy(dtype=float))[:, 1]
        cal = IsotonicRegression(out_of_bounds="clip", y_min=0.0, y_max=1.0).fit(raw, val["label"].to_numpy())
        s, yv = np.clip(cal.predict(raw), 0, 1), val["label"].to_numpy()
        block = threshold_at_fpr(s, yv, cfg["policy"]["max_false_decline_rate"])
        step = min(block, threshold_at_fpr(s, yv, cfg["policy"]["max_false_decline_rate"] + cfg["policy"]["max_step_up_rate"]))
        return FraudModel(estimator, cal, names, float(step), float(block))

    # Model selection happens on the VALIDATION window; the test window is only ever used to report and to gate.
    Xv, yv = val[names].to_numpy(dtype=float), val["label"].to_numpy()
    val_pr_auc = {
        "logistic_regression": float(average_precision_score(yv, baseline.predict_proba(Xv)[:, 1])),
        "gradient_boosting": float(average_precision_score(yv, clf.predict_proba(Xv)[:, 1])),
    }
    algorithm = max(val_pr_auc, key=val_pr_auc.get)
    packaged = {"logistic_regression": package(baseline), "gradient_boosting": package(clf)}
    model = packaged[algorithm]
    metrics = measure(model, test)
    all_metrics = {name: {k: round(v, 4) for k, v in measure(m, test).items()} for name, m in packaged.items()}

    registry = Registry(settings().registry_dir)
    prod_pr_auc = prod_version = None
    try:
        prod, prod_manifest = registry.load(cfg["model_name"])
        if prod.features == names:  # only comparable when the inputs are the same
            prod_pr_auc, prod_version = measure(prod, test)["pr_auc"], prod_manifest["version"]
    except RegistryError:
        pass

    reference = {n: drift.reference_bins(train[n].to_numpy(dtype=float)) for n in names}
    reference["__score__"] = drift.reference_bins(model.score(X))
    version = registry.register(
        cfg["model_name"],
        model,
        metrics={k: round(v, 5) for k, v in metrics.items()},
        params={"algorithm": algorithm, **(params if algorithm == "gradient_boosting" else {"class_weight": "balanced"})},
        features=names,
        training_data_hash=data_hash(len(good), float(good["event_time"].min()), float(good["event_time"].max()),
                                     int(good["label"].sum()), names),
        extra={
            "as_of": as_of,
            "rows": {"train": len(train), "validation": len(val), "test": len(test), "quarantined_rows": report.bad_rows},
            "thresholds": {"step_up": model.step_up_threshold, "block": model.block_threshold},
            "algorithm": algorithm,
            "validation_pr_auc": val_pr_auc,
            "test_metrics_by_algorithm": all_metrics,
            "production_at_training": {"version": prod_version, "pr_auc_same_test": prod_pr_auc},
            "drift_reference": reference,
        },
    )
    fails = gate(metrics, prod_pr_auc, cfg)
    promoted = False
    if not fails and cfg["gates"]["auto_promote"]:
        registry.promote(cfg["model_name"], version, by=by, reason="all promotion gates passed")
        promoted = True
    with db.tx() as conn:
        db.audit(conn, by, "model.train", f"{cfg['model_name']}/{version}",
                 {"promoted": promoted, "failed_gates": fails, "pr_auc": metrics["pr_auc"], "algorithm": algorithm})
    return {
        "version": version,
        "promoted": promoted,
        "failed_gates": fails,
        "rows": {"train": len(train), "validation": len(val), "test": len(test)},
        "selected_algorithm": algorithm,
        "validation_pr_auc": {k: round(v, 4) for k, v in val_pr_auc.items()},
        "test_metrics": {k: round(v, 4) for k, v in metrics.items()},
        "test_metrics_by_algorithm": all_metrics,
        "production_pr_auc_same_test": prod_pr_auc,
        "thresholds": {"step_up": round(model.step_up_threshold, 4), "block": round(model.block_threshold, 4)},
    }


if __name__ == "__main__":
    db.init_schema()
    print(json.dumps(run(), indent=2))
