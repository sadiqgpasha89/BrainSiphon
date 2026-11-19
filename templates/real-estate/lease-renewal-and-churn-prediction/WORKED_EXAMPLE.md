# Lease Renewal & Tenant Churn Prediction: worked example

> Run on synthetic data with `tabular` engine, seed 75919, knobs {"n_entities": 2060, "positive_entity_rate": 0.037, "n_flash_sales": 4}, in 2.4 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict which tenants will renew so managers can set renewal offers that keep good tenants without leaving rent on the table.

**Constraints that shape the design.** Renewal offers follow every local rent-control and notice rule; Offers are consistent and fair between comparable tenants; The decision is made 120 days before expiry to leave room to react

**Label in this use case.** For "Lease Renewal & Tenant Churn Prediction": Predict which tenants will renew so managers can set renewal offers that keep good tenants without leaving rent on the table. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Past offers were not random, so renewals reflect the offer chosen and not the tenant.

## 2. Choose the signals

Your strongest signal is **Renewal rent gap** (proposed renewal rent minus the market rent for a similar unit). Its rule: Market rent estimates are noisy, so use a range. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.55% of the test period) and labels arrive weeks late. A model that always answers no would be 99.45% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.604 and finds 78.8% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.807 and 82.8%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.55% |
| Baseline PR-AUC | 0.604 |
| Baseline recall at 0.5% false positives | 78.8% |
| Challenger PR-AUC | 0.807 |
| Challenger recall at 0.5% false positives | 82.8% |

## 5. An edge case from the blueprint

**Rent control.** Rent-control rules cap the increase and the offer would exceed the legal limit. Planned response: Apply the cap as a hard constraint in the offer optimiser. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 158066 |
| `positive_rate` | 0.0052257 |
| `test_rows` | 52464 |
| `test_positive_rate` | 0.0055276 |
| `baseline_lr.pr_auc` | 0.60396 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.78782 |
| `baseline_lr.brier` | 0.0053398 |
| `challenger_hgb.pr_auc` | 0.80701 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.82759 |
| `challenger_hgb.brier` | 0.0018543 |

</details>
