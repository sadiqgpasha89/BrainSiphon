# Commercial Tenant Credit Risk: worked example

> Run on synthetic data with `tabular` engine, seed 67852, knobs {"n_entities": 2320, "positive_entity_rate": 0.023, "n_flash_sales": 5}, in 1.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict the likelihood that commercial tenants default on rent so landlords price deposits, incentives and exposure.

**Constraints that shape the design.** Each score shows the factors behind it so an asset manager can explain it; Refreshed monthly as rent ledgers close; Data licences for vendor financials are respected

**Label in this use case.** For "Commercial Tenant Credit Risk": Predict the likelihood that commercial tenants default on rent so landlords price deposits, incentives and exposure. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Few defaults make any estimate noisy and hide poor performance on the rare cases.

## 2. Choose the signals

Your strongest signal is **Payment days trend** (change in average days paid after the due date over the last 6 months). Its rule: Agreed concessions look like lateness, so exclude them. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.28% of the test period) and labels arrive weeks late. A model that always answers no would be 99.72% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.730 and finds 81.7% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.810 and 85.4%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.28% |
| Baseline PR-AUC | 0.730 |
| Baseline recall at 0.5% false positives | 81.7% |
| Challenger PR-AUC | 0.810 |
| Challenger recall at 0.5% false positives | 85.4% |

## 5. An edge case from the blueprint

**Anchor tenant.** The largest tenant is a big share of income and its default dominates the risk. Planned response: Treat large tenants as single names with their own limits. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 174351 |
| `positive_rate` | 0.0032062 |
| `test_rows` | 57702 |
| `test_positive_rate` | 0.0028422 |
| `baseline_lr.pr_auc` | 0.73028 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.81707 |
| `baseline_lr.brier` | 0.0021185 |
| `challenger_hgb.pr_auc` | 0.81021 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.85366 |
| `challenger_hgb.brier` | 0.0009832 |

</details>
