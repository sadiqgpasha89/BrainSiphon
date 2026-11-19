"""Executable exit gates for milestones M1-M4. `pytest -q` must pass before you move on."""

import numpy as np
import pytest

from baseline import FEATURES, run, split
from features import DAY, build_features
from make_data import generate


@pytest.fixture(scope="module")
def tx():
    return generate(seed=7)


def test_generator_is_deterministic_and_realistically_imbalanced(tx):
    again = generate(seed=7)
    assert tx.equals(again)
    assert 0.002 < tx.is_fraud.mean() < 0.012  # fraud is rare; 50/50 data would hide every trap


def test_features_use_only_the_past(tx):
    """The canonical leakage test: deleting the future must not change any feature of the past."""
    cut = 60 * DAY
    full = build_features(tx).set_index("txn_id")
    past = build_features(tx[tx.ts <= cut]).set_index("txn_id")
    common = past.index
    a, b = full.loc[common, FEATURES].to_numpy(), past[FEATURES].to_numpy()
    assert np.allclose(a, b, equal_nan=True), "a feature changed when future rows were removed -> leakage"


def test_velocity_windows_exclude_the_current_event():
    import pandas as pd
    t = pd.DataFrame({"txn_id": [0, 1, 2], "ts": [0.0, 30.0, 61.0], "card": [1, 1, 1], "device": [9, 9, 9],
                      "merchant": [5, 5, 5], "amount": [10.0, 20.0, 30.0], "is_fraud": [0, 0, 0],
                      "label_ts": [1e9, 1e9, 1e9]})
    f = build_features(t).set_index("txn_id")
    assert list(f.card_cnt_1m) == [0, 1, 1]          # row 2 sees only the event at t=30 (t=0 is 61 s old)
    assert list(f.card_sum_1h) == [0, 10, 30]


def test_training_rows_have_matured_labels(tx):
    train, _, test = split(build_features(tx))
    assert train.ts.max() < test.ts.min()
    assert train.label_ts.max() < test.ts.min()


def test_baseline_clears_the_gate_and_challenger_earns_its_complexity():
    rep = run(seed=7)
    base, chal = rep["baseline_lr"], rep["challenger_hgb"]
    assert base["recall_at_0.5pct_fpr"] >= 0.60, rep      # M2 gate
    assert base["pr_auc"] >= 0.55, rep
    assert chal["pr_auc"] >= 0.95 * base["pr_auc"], rep   # M3 gate: no regression for the added complexity


# --- Phase 1 consistency gates: the business ceiling, the decision vocabulary and the UPI variant ----------------------------
# Spec constraint: "false declines stay under 0.3% of genuine volume, measured across allow, step-up and block".
# Recall at 0.5% FPR (above) ranks models; it is not that ceiling, and nothing above proved the ceiling until these tests.

FALSE_DECLINE_CEILING = 0.003


@pytest.mark.parametrize("mode", ["card", "upi"])
def test_false_decline_rate_on_genuine_volume_stays_under_the_ceiling(mode):
    """The acceptance gate for the business constraint: measured on genuine test-window volume, across all three actions."""
    from baseline import POLICY

    rep = run(seed=7, mode=mode)
    for name in ("baseline_lr", "challenger_hgb"):
        pol = rep[name]["policy"]
        g = pol["genuine"]
        assert g["allow"] + g["step_up"] + g["block"] == pol["genuine_rows"], "every genuine row gets exactly one action"
        # a blocked genuine payment is a decline; a stepped-up one is a decline only when the customer fails or abandons the challenge
        expected = (g["block"] + POLICY["step_up_failure_rate"] * g["step_up"]) / pol["genuine_rows"]
        assert pol["false_decline_rate"] == pytest.approx(expected)
        assert pol["false_decline_rate"] <= FALSE_DECLINE_CEILING, (mode, name, pol)
        assert pol["step_up_rate_on_genuine"] <= POLICY["step_up_budget"] * 1.5, (mode, name, pol)
        assert pol["fraud"]["allow"] < pol["fraud_rows"], "a policy that allows all fraud also meets the ceiling; it must catch something"


def test_the_half_percent_fpr_operating_point_alone_would_breach_the_ceiling():
    """Why the ceiling needs its own gate: 0.5% of genuine flagged is already more than the 0.3% that may be declined."""
    assert 0.005 > FALSE_DECLINE_CEILING
    rep = run(seed=7)
    assert rep["baseline_lr"]["policy"]["false_decline_rate"] < 0.005


def test_decision_vocabulary_is_allow_step_up_block():
    from baseline import DECISIONS

    assert DECISIONS == ("allow", "step_up", "block")  # mapped to ALLOW | STEP_UP | BLOCK in the API contract


def test_upi_labels_come_from_complaints_and_recoveries_not_chargebacks():
    upi = generate(seed=7, mode="upi")
    assert set(upi.label_source.unique()) <= {"complaint", "recovery", "none"}
    assert "chargeback" not in set(upi.label_source.unique())
    assert set(generate(seed=7).label_source.unique()) <= {"chargeback", "none"}


def test_upi_labels_mature_faster_than_card_labels_and_some_fraud_is_never_reported():
    from make_data import label_maturity_curve

    card, upi = generate(seed=7), generate(seed=7, mode="upi")
    cc, uc = label_maturity_curve(card), label_maturity_curve(upi)
    assert uc[3] > cc[3], "by day 3 far more UPI than card fraud is labelled"
    assert uc[7] >= 0.9 * uc[21], "the UPI curve has flattened by its short maturity window"
    assert cc[21] == pytest.approx(1.0) and cc[7] < 0.2, "card labels are still arriving until the chargeback window closes"
    fraud = upi[upi.is_fraud == 1]
    silent = (fraud.label == 0).mean()
    assert 0.1 < silent < 0.4, "UPI fraud nobody reports never becomes a positive label"
    assert (generate(seed=7).query("is_fraud == 1").label == 1).all(), "card labels eventually cover every fraud"


def test_upi_mode_is_deterministic_and_leaves_card_data_unchanged():
    assert generate(seed=7, mode="upi").equals(generate(seed=7, mode="upi"))
    card, upi = generate(seed=7), generate(seed=7, mode="upi")
    assert card[["ts", "card", "device", "merchant", "amount", "is_fraud"]].equals(upi[["ts", "card", "device", "merchant", "amount", "is_fraud"]])


def test_each_variant_has_its_own_split_and_a_matured_training_set():
    from baseline import SPLITS

    assert SPLITS["upi"][2] < SPLITS["card"][2], "a shorter label window allows an earlier test period"
    for mode in ("card", "upi"):
        train, _, test = split(build_features(generate(seed=7, mode=mode)), mode=mode)
        assert train.label_ts.max() < test.ts.min()
