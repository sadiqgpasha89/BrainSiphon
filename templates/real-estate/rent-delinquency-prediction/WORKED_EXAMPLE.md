# Rent Delinquency Prediction: worked example

> Run on synthetic data with `tabular` engine, seed 64706, knobs {"n_entities": 2040, "positive_entity_rate": 0.039, "n_flash_sales": 6}, in 1.4 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict which tenants will miss rent in the next month so property managers can reach out early with payment plans.

**Constraints that shape the design.** Outreach is supportive and offers help, never a threat; No eviction or legal decision is taken from a score; Each score shows the factors behind it

**Label in this use case.** For "Rent Delinquency Prediction": Predict which tenants will miss rent in the next month so property managers can reach out early with payment plans. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Outreach changes outcomes, so a tenant helped by a plan looks like a false alarm.

## 2. Choose the signals

Your strongest signal is **Payment timing drift** (change in days between the due date and payment over the last 4 months). Its rule: Autopay hides it, so analyse autopay tenants through a different signal. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.39% of the test period) and labels arrive weeks late. A model that always answers no would be 99.61% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.705 and finds 73.2% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.743 and 76.1%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.39% |
| Baseline PR-AUC | 0.705 |
| Baseline recall at 0.5% false positives | 73.2% |
| Challenger PR-AUC | 0.743 |
| Challenger recall at 0.5% false positives | 76.1% |

## 5. An edge case from the blueprint

**Payday timing.** Tenants are paid on different cycles and look late against a common due date. Planned response: Use each tenant's pay cycle when computing timing features. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 157388 |
| `positive_rate` | 0.0048479 |
| `test_rows` | 52065 |
| `test_positive_rate` | 0.0039374 |
| `baseline_lr.pr_auc` | 0.70457 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.73171 |
| `baseline_lr.brier` | 0.0017815 |
| `challenger_hgb.pr_auc` | 0.74334 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.76098 |
| `challenger_hgb.brier` | 0.001595 |

</details>
