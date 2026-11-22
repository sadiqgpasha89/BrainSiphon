# Healthcare Contract-Based Price Variance Detection: worked example

> Run on synthetic data with `tabular` engine, seed 84190, knobs {"n_entities": 2610, "positive_entity_rate": 0.036, "n_flash_sales": 3}, in 12.0 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Find differences between contracted and invoiced or paid prices after accounting for units, tiers, rebates, freight, taxes and amendments, and quantify the recoverable amount for finance to validate.

**Constraints that shape the design.** A deterministic calculation gives the expected price and anomaly prioritisation only ranks the residual; Finance validates every recovery and dispute and the system does not claim a recovery; Units, tiers, rebates, freight and tax are modelled explicitly

**Label in this use case.** For "Healthcare Contract-Based Price Variance Detection": Find differences between contracted and invoiced or paid prices after accounting for units, tiers, rebates, freight, taxes and amendments, and quantify the recoverable amount for finance to validate. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Treating all variance as recoverable.

## 2. Choose the signals

Your strongest signal is **Contract price at invoice date** (effective-dated scheduled price for the item and tier). Its rule: Version at invoice date. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.44% of the test period) and labels arrive weeks late. A model that always answers no would be 99.56% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.627 and finds 66.2% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.645 and 68.6%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.44% |
| Baseline PR-AUC | 0.627 |
| Baseline recall at 0.5% false positives | 66.2% |
| Challenger PR-AUC | 0.645 |
| Challenger recall at 0.5% false positives | 68.6% |

## 5. An edge case from the blueprint

**Contract price schedule revised.** past invoices look wrong. Planned response: Effective-dated versions. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 201847 |
| `positive_rate` | 0.0044489 |
| `test_rows` | 66894 |
| `test_positive_rate` | 0.0043801 |
| `baseline_lr.pr_auc` | 0.62662 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.66212 |
| `baseline_lr.brier` | 0.0023515 |
| `challenger_hgb.pr_auc` | 0.64533 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.68601 |
| `challenger_hgb.brier` | 0.0023035 |

</details>
