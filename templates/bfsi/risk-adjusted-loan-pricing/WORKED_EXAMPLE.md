# Risk-Adjusted Loan Pricing (RAROC): worked example

> Run on synthetic data with `tabular` engine, seed 2451, knobs {"n_entities": 2370, "positive_entity_rate": 0.039, "n_flash_sales": 6}, in 3.1 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Recommend the loan rate and fees that meet the hurdle return on capital while winning the deals worth winning.

**Constraints that shape the design.** Never price below the risk-adjusted floor without approval; Pricing explainable to relationship managers; Fair lending rules apply to retail segments

**Label in this use case.** For "Risk-Adjusted Loan Pricing (RAROC)": Recommend the loan rate and fees that meet the hurdle return on capital while winning the deals worth winning. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Truncated quote data biases elasticity.

## 2. Choose the signals

Your strongest signal is **Quote-to-win curve** (logistic model of win versus price gap to the market). Its rule: Quote data is truncated where deals never reached a quote. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.51% of the test period) and labels arrive weeks late. A model that always answers no would be 99.49% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.685 and finds 82.2% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.847 and 86.7%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.51% |
| Baseline PR-AUC | 0.685 |
| Baseline recall at 0.5% false positives | 82.2% |
| Challenger PR-AUC | 0.847 |
| Challenger recall at 0.5% false positives | 86.7% |

## 5. An edge case from the blueprint

**Market rate shock.** funding costs jump during the quote validity period. Planned response: Rate-lock windows and repricing triggers on funding moves. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 184332 |
| `positive_rate` | 0.0048988 |
| `test_rows` | 61982 |
| `test_positive_rate` | 0.0050821 |
| `baseline_lr.pr_auc` | 0.68472 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.82222 |
| `baseline_lr.brier` | 0.0042973 |
| `challenger_hgb.pr_auc` | 0.84693 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.86667 |
| `challenger_hgb.brier` | 0.0015284 |

</details>
