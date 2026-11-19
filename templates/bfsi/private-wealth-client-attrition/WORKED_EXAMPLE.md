# Private Wealth Client Attrition Early Warning: worked example

> Run on synthetic data with `tabular` engine, seed 36066, knobs {"n_entities": 2410, "positive_entity_rate": 0.044, "n_flash_sales": 5}, in 2.8 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Identify high-net-worth clients likely to move assets away in the next 6 months so the relationship team can act.

**Constraints that shape the design.** Rank only, no automatic action; Explainable reasons; Advisor capacity 50 calls a week

**Label in this use case.** For "Private Wealth Client Attrition Early Warning": Identify high-net-worth clients likely to move assets away in the next 6 months so the relationship team can act. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Retention actions change labels.

## 2. Choose the signals

Your strongest signal is **Net outflow 90d share** (outflows over assets for 90 days). Its rule: Seasonal tax payments. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.68% of the test period) and labels arrive weeks late. A model that always answers no would be 99.32% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.805 and finds 81.0% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.786 and 76.1%; the baseline is ahead: the added complexity did not earn its place on this run.

| Result | Value |
|---|---|
| Test-period positive rate | 0.68% |
| Baseline PR-AUC | 0.805 |
| Baseline recall at 0.5% false positives | 81.0% |
| Challenger PR-AUC | 0.786 |
| Challenger recall at 0.5% false positives | 76.1% |

## 5. An edge case from the blueprint

**Planned large withdrawal.** A client withdraws money for a house purchase and the model reads it as leaving. Planned response: Allow advisors to record planned withdrawals and exclude them from attrition signals. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 183472 |
| `positive_rate` | 0.005881 |
| `test_rows` | 61260 |
| `test_positive_rate` | 0.0067744 |
| `baseline_lr.pr_auc` | 0.8048 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.80964 |
| `baseline_lr.brier` | 0.0027186 |
| `challenger_hgb.pr_auc` | 0.78638 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.76145 |
| `challenger_hgb.brier` | 0.0026385 |

</details>
