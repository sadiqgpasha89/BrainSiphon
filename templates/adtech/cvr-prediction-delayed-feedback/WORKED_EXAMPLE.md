# Conversion Rate Prediction with Delayed Feedback: worked example

> Run on synthetic data with `tabular` engine, seed 49595, knobs {"n_entities": 2830, "positive_entity_rate": 0.037, "n_flash_sales": 4}, in 1.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict conversion probability when conversions arrive minutes to weeks after the click, without biasing toward fast converters.

**Constraints that shape the design.** Fresh model within hours; Attribution-window changes; Long-tail delays

**Label in this use case.** For "Conversion Rate Prediction with Delayed Feedback": Predict conversion probability when conversions arrive minutes to weeks after the click, without biasing toward fast converters. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating on immature labels.

## 2. Choose the signals

Your strongest signal is **Elapsed time since click** (seconds since click at label time). Its rule: Server clock. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.43% of the test period) and labels arrive weeks late. A model that always answers no would be 99.57% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.701 and finds 74.6% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.747 and 76.5%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.43% |
| Baseline PR-AUC | 0.701 |
| Baseline recall at 0.5% false positives | 74.6% |
| Challenger PR-AUC | 0.747 |
| Challenger recall at 0.5% false positives | 76.5% |

## 5. An edge case from the blueprint

**Attribution partner changes lookback window.** label definition changes silently. Planned response: Window version in features and backfill labels. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 213371 |
| `positive_rate` | 0.0049819 |
| `test_rows` | 71774 |
| `test_positive_rate` | 0.0042773 |
| `baseline_lr.pr_auc` | 0.70125 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.74593 |
| `baseline_lr.brier` | 0.0031739 |
| `challenger_hgb.pr_auc` | 0.74672 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.76547 |
| `challenger_hgb.brier` | 0.0017411 |

</details>
