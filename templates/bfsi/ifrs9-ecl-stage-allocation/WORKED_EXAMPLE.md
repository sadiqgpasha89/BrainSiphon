# IFRS 9 Expected Credit Loss Staging: worked example

> Run on synthetic data with `tabular` engine, seed 52553, knobs {"n_entities": 1950, "positive_entity_rate": 0.028, "n_flash_sales": 7}, in 2.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Allocate each exposure to IFRS 9 stage 1, 2 or 3 and estimate lifetime expected loss so provisions respond to deteriorating credit without whipsaw.

**Constraints that shape the design.** Staging rules must be explainable to the auditor; Monthly close under 4 hours; Forward-looking scenarios from the economics team

**Label in this use case.** For "IFRS 9 Expected Credit Loss Staging": Allocate each exposure to IFRS 9 stage 1, 2 or 3 and estimate lifetime expected loss so provisions respond to deteriorating credit without whipsaw. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Random split ignores economic cycles.

## 2. Choose the signals

Your strongest signal is **Lifetime PD ratio** (current lifetime PD divided by lifetime PD at origination). Its rule: The origination PD must be preserved, not re-estimated. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.51% of the test period) and labels arrive weeks late. A model that always answers no would be 99.49% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.781 and finds 80.4% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.771 and 77.7%; the baseline is ahead: the added complexity did not earn its place on this run.

| Result | Value |
|---|---|
| Test-period positive rate | 0.51% |
| Baseline PR-AUC | 0.781 |
| Baseline recall at 0.5% false positives | 80.4% |
| Challenger PR-AUC | 0.771 |
| Challenger recall at 0.5% false positives | 77.7% |

## 5. An edge case from the blueprint

**Model change at quarter end.** provisions jump for modelling reasons. Planned response: Parallel run, bridge analysis and an approved overlay for transitions. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 149097 |
| `positive_rate` | 0.0038968 |
| `test_rows` | 51202 |
| `test_positive_rate` | 0.0050779 |
| `baseline_lr.pr_auc` | 0.78057 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.80385 |
| `baseline_lr.brier` | 0.0018986 |
| `challenger_hgb.pr_auc` | 0.77132 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.77692 |
| `challenger_hgb.brier` | 0.0019356 |

</details>
