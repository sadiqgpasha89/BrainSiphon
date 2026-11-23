# Access Recertification Recommendations: worked example

> Run on synthetic data with `tabular` engine, seed 25002, knobs {"n_entities": 2940, "positive_entity_rate": 0.041, "n_flash_sales": 4}, in 4.5 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Recommend which entitlements reviewers should keep or revoke in access reviews, from peer groups, usage and risk, with evidence to cut rubber-stamping.

**Constraints that shape the design.** Reviewers make every decision; High-risk entitlements always shown; Each recommendation shows its evidence

**Label in this use case.** For "Access Recertification Recommendations": Recommend which entitlements reviewers should keep or revoke in access reviews, from peer groups, usage and risk, with evidence to cut rubber-stamping. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Approval rates as signals.

## 2. Choose the signals

Your strongest signal is **Last used date** (days since the entitlement was used). Its rule: From system logs. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.59% of the test period) and labels arrive weeks late. A model that always answers no would be 99.41% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.717 and finds 74.4% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.733 and 73.7%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.59% |
| Baseline PR-AUC | 0.717 |
| Baseline recall at 0.5% false positives | 74.4% |
| Challenger PR-AUC | 0.733 |
| Challenger recall at 0.5% false positives | 73.7% |

## 5. An edge case from the blueprint

**Seasonal access.** people use access once a year. Planned response: Seasonal usage windows. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 227765 |
| `positive_rate` | 0.0050403 |
| `test_rows` | 76144 |
| `test_positive_rate` | 0.0058836 |
| `baseline_lr.pr_auc` | 0.71671 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.74401 |
| `baseline_lr.brier` | 0.0025803 |
| `challenger_hgb.pr_auc` | 0.73269 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.73661 |
| `challenger_hgb.brier` | 0.0025519 |

</details>
