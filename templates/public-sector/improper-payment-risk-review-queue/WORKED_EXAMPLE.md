# Improper Payment Risk Review Queue: worked example

> Run on synthetic data with `tabular` engine, seed 27835, knobs {"n_entities": 2140, "positive_entity_rate": 0.031, "n_flash_sales": 7}, in 3.4 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Rank payments and claims for post-payment review by the likelihood of error or overpayment so limited audit staff check where errors are likely, with no benefit stopped on a score alone.

**Constraints that shape the design.** Scores select cases for human review only; No payment is stopped or reduced on a score; Error and fraud kept separate

**Label in this use case.** For "Improper Payment Risk Review Queue": Rank payments and claims for post-payment review by the likelihood of error or overpayment so limited audit staff check where errors are likely, with no benefit stopped on a score alone. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Automatic suspension.

## 2. Choose the signals

Your strongest signal is **Income and circumstance mismatch** (differences between declared and registry data). Its rule: From data matching. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.33% of the test period) and labels arrive weeks late. A model that always answers no would be 99.67% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.773 and finds 86.2% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.781 and 82.5%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.33% |
| Baseline PR-AUC | 0.773 |
| Baseline recall at 0.5% false positives | 86.2% |
| Challenger PR-AUC | 0.781 |
| Challenger recall at 0.5% false positives | 82.5% |

## 5. An edge case from the blueprint

**Biased labels.** past flags drive new flags. Planned response: Random audit samples for training. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 168020 |
| `positive_rate` | 0.004065 |
| `test_rows` | 56520 |
| `test_positive_rate` | 0.0033439 |
| `baseline_lr.pr_auc` | 0.77318 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.86183 |
| `baseline_lr.brier` | 0.0014959 |
| `challenger_hgb.pr_auc` | 0.78135 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.8254 |
| `challenger_hgb.brier` | 0.001321 |

</details>
