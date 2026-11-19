# Viewability & Attention Prediction: worked example

> Run on synthetic data with `tabular` engine, seed 56019, knobs {"n_entities": 2610, "positive_entity_rate": 0.045, "n_flash_sales": 4}, in 1.9 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict whether an ad impression will be viewable and attended to, to bid on quality inventory and verify delivery.

**Constraints that shape the design.** Pre-bid prediction; MRC viewability standard; Publisher fairness

**Label in this use case.** For "Viewability & Attention Prediction": Predict whether an ad impression will be viewable and attended to, to bid on quality inventory and verify delivery. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using publisher-reported viewability as truth.

## 2. Choose the signals

Your strongest signal is **Placement position and size** (slot geometry). Its rule: Context. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.53% of the test period) and labels arrive weeks late. A model that always answers no would be 99.47% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.735 and finds 81.8% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.840 and 86.6%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.53% |
| Baseline PR-AUC | 0.735 |
| Baseline recall at 0.5% false positives | 81.8% |
| Challenger PR-AUC | 0.840 |
| Challenger recall at 0.5% false positives | 86.6% |

## 5. An edge case from the blueprint

**Page layout changes after redesign.** stale predictions. Planned response: Layout-change detection and quick refresh. Write the test that replays this case through your pipeline before you tune anything.

## 6. What to expect on your own data

Expect lower numbers and a different first failure on real data. Keep the chronological split, the matured-label rule and the future-truncation test, and replace the synthetic generator with your extract.

## 7. Do this next

1. `cd starter && make setup && make demo` to reproduce the table above.
2. Replace the synthetic generator with an extract of your data and keep the split, the leakage tests and the gates.
3. Run through `docs/02-delivery-plan.md` milestone by milestone; each exit gate is a number you can check.

<details>
<summary>Every number from this run</summary>

| Metric | Value |
|---|---|
| `rows` | 200588 |
| `positive_rate` | 0.0060721 |
| `test_rows` | 66623 |
| `test_positive_rate` | 0.0052685 |
| `baseline_lr.pr_auc` | 0.73453 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.81766 |
| `baseline_lr.brier` | 0.0034217 |
| `challenger_hgb.pr_auc` | 0.83956 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.8661 |
| `challenger_hgb.brier` | 0.001745 |

</details>
