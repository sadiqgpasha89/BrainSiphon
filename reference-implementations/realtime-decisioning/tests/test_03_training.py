"""Label maturity, the chronological split, thresholds, gates and the registry."""

import numpy as np

from bsref import db
from bsref.config import load_yaml, settings
from bsref.registry import Registry
from training import dataset, train

DAY = 86400.0


def test_only_matured_rows_are_labelled_and_each_split_has_both_classes(world):
    cfg = load_yaml("configs/pipeline.yaml")
    with db.tx() as c:
        frame, _ = dataset.build(c, cfg)
        as_of = dataset.watermark(c)
    assert frame["event_time"].max() <= as_of - cfg["labels"]["maturity_days"] * DAY
    tr, va, te = dataset.split(frame, cfg)
    assert tr["event_time"].max() < va["event_time"].min() <= va["event_time"].max() < te["event_time"].min()
    for part in (tr, va, te):
        assert 0 < part["label"].mean() < 0.2  # both classes present: no positives-only recent slice


def test_a_label_filed_after_as_of_is_invisible(world):
    cfg = load_yaml("configs/pipeline.yaml")
    with db.tx() as c:
        now = dataset.watermark(c)
        full, _ = dataset.build(c, cfg, now)
        earlier, _ = dataset.build(c, cfg, now - 20 * DAY)
    late = full.set_index("txn_id").loc[earlier["txn_id"], "label"].to_numpy()
    assert earlier["label"].sum() <= late.sum()  # some frauds were still unreported 20 days earlier
    assert earlier["event_time"].max() <= now - 20 * DAY - cfg["labels"]["maturity_days"] * DAY


def test_threshold_respects_the_false_positive_budget_even_with_ties():
    y = np.array([0] * 1000 + [1] * 10)
    scores = np.concatenate([np.zeros(900), np.full(100, 0.2), np.full(10, 0.9)])
    thr = train.threshold_at_fpr(scores, y, 0.05)  # 50 genuine rows allowed, but 100 are tied at 0.2
    assert ((scores >= thr) & (y == 0)).sum() <= 50 and ((scores >= thr) & (y == 1)).sum() == 10


def test_first_model_passes_its_gates_and_is_packaged_with_lineage(world):
    m = world["first_model"]
    assert m["promoted"] and m["failed_gates"] == []
    assert m["test_metrics"]["pr_auc"] >= 0.30 and m["test_metrics"]["false_decline_rate"] <= 0.006
    man = Registry(settings().registry_dir).manifest("fraud-scorer", m["version"])
    assert man["sha256"] and man["training_data_hash"] and len(man["features"]) == 15
    assert set(man["extra"]["drift_reference"]) >= set(man["features"])
    assert man["extra"]["thresholds"]["step_up"] <= man["extra"]["thresholds"]["block"]


def test_gates_reject_a_weak_or_regressing_candidate():
    cfg = load_yaml("configs/pipeline.yaml")
    good = {"pr_auc": 0.8, "recall_at_block": 0.7, "false_decline_rate": 0.002}
    assert train.gate(good, 0.79, cfg) == []
    assert len(train.gate({**good, "pr_auc": 0.1}, None, cfg)) == 1
    assert len(train.gate({**good, "false_decline_rate": 0.05}, None, cfg)) == 1
    assert "regresses" in train.gate(good, 0.9, cfg)[0]
