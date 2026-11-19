# Supplier Risk & Disruption Prediction: worked example

> Run on synthetic data with `tabular` engine, seed 43517, knobs {"n_entities": 2290, "positive_entity_rate": 0.022, "n_flash_sales": 5}, in 2.8 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict supplier failures and disruptions across tiers by fusing financial, operational, geographic and news signals.

**Constraints that shape the design.** Multi-tier visibility; Data licensing; Weekly updates

**Label in this use case.** For "Supplier Risk & Disruption Prediction": Predict supplier failures and disruptions across tiers by fusing financial, operational, geographic and news signals. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Rare disruptions leave few labels.

## 2. Choose the signals

Your strongest signal is **Payment delay trend** (days beyond terms over 6 months). Its rule: Matured payments. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.26% of the test period) and labels arrive weeks late. A model that always answers no would be 99.74% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.555 and finds 67.5% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.647 and 68.2%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.26% |
| Baseline PR-AUC | 0.555 |
| Baseline recall at 0.5% false positives | 67.5% |
| Challenger PR-AUC | 0.647 |
| Challenger recall at 0.5% false positives | 68.2% |

## 5. An edge case from the blueprint

**Entity resolution merges different suppliers.** false risk propagation. Planned response: Conservative matching with human verification. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 175166 |
| `positive_rate` | 0.0028659 |
| `test_rows` | 59234 |
| `test_positive_rate` | 0.0025999 |
| `baseline_lr.pr_auc` | 0.55478 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.67532 |
| `baseline_lr.brier` | 0.0025509 |
| `challenger_hgb.pr_auc` | 0.64687 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.68182 |
| `challenger_hgb.brier` | 0.0012597 |

</details>
