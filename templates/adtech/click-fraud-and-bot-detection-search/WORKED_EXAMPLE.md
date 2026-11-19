# Click Fraud Detection for Search Ads: worked example

> Run on synthetic data with `tabular` engine, seed 11943, knobs {"n_entities": 2010, "positive_entity_rate": 0.039, "n_flash_sales": 8}, in 1.4 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect competitor clicking and click farms on paid search to protect advertisers' budgets and keep trust.

**Constraints that shape the design.** Real-time filtering within billing; Appeals; Low false positives for genuine users

**Label in this use case.** For "Click Fraud Detection for Search Ads": Detect competitor clicking and click farms on paid search to protect advertisers' budgets and keep trust. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Confirmed fraud sample biased to obvious cases.

## 2. Choose the signals

Your strongest signal is **Post-click dwell and bounce** (seconds on landing page). Its rule: Consent. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.68% of the test period) and labels arrive weeks late. A model that always answers no would be 99.32% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.775 and finds 80.7% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.800 and 81.5%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.68% |
| Baseline PR-AUC | 0.775 |
| Baseline recall at 0.5% false positives | 80.7% |
| Challenger PR-AUC | 0.800 |
| Challenger recall at 0.5% false positives | 81.5% |

## 5. An edge case from the blueprint

**Mobile carrier NAT aggregates many users.** IP-based false positives. Planned response: Device-level and session-level features instead of IP-only. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 158840 |
| `positive_rate` | 0.0052506 |
| `test_rows` | 53406 |
| `test_positive_rate` | 0.006797 |
| `baseline_lr.pr_auc` | 0.77515 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.80701 |
| `baseline_lr.brier` | 0.0025895 |
| `challenger_hgb.pr_auc` | 0.79979 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.81543 |
| `challenger_hgb.brier` | 0.0024112 |

</details>
