# Pre-Purchase Return Risk & Prevention: worked example

> Run on synthetic data with `tabular` engine, seed 6937, knobs {"n_entities": 2780, "positive_entity_rate": 0.021, "n_flash_sales": 4}, in 2.4 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict the likelihood a specific order line will be returned and use gentle interventions (fit info, alternate size) to prevent avoidable returns.

**Constraints that shape the design.** Do not discourage genuine purchases; Transparent nudges; 50 ms

**Label in this use case.** For "Pre-Purchase Return Risk & Prevention": Predict the likelihood a specific order line will be returned and use gentle interventions (fit info, alternate size) to prevent avoidable returns. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on observational nudges.

## 2. Choose the signals

Your strongest signal is **Bracketing behaviour** (multiple sizes of same item in cart). Its rule: Cart state at time. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.27% of the test period) and labels arrive weeks late. A model that always answers no would be 99.73% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.692 and finds 75.3% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.745 and 80.0%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.27% |
| Baseline PR-AUC | 0.692 |
| Baseline recall at 0.5% false positives | 75.3% |
| Challenger PR-AUC | 0.745 |
| Challenger recall at 0.5% false positives | 80.0% |

## 5. An edge case from the blueprint

**Intended bracketing for try-at-home.** suppressed incorrectly. Planned response: Cohort rules for try-at-home segment. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 208404 |
| `positive_rate` | 0.0027447 |
| `test_rows` | 69957 |
| `test_positive_rate` | 0.002716 |
| `baseline_lr.pr_auc` | 0.69186 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.75263 |
| `baseline_lr.brier` | 0.0012995 |
| `challenger_hgb.pr_auc` | 0.74462 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.8 |
| `challenger_hgb.brier` | 0.0010948 |

</details>
