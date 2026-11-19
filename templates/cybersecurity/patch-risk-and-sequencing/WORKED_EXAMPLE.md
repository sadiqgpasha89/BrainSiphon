# Patch Risk Prediction & Sequencing: worked example

> Run on synthetic data with `tabular` engine, seed 80554, knobs {"n_entities": 2040, "positive_entity_rate": 0.025, "n_flash_sales": 8}, in 1.6 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict which patches will cause outages and schedule rollouts in rings to cut patch-induced downtime.

**Constraints that shape the design.** Change windows; Rollback capability; Dependency graph

**Label in this use case.** For "Patch Risk Prediction & Sequencing": Predict which patches will cause outages and schedule rollouts in rings to cut patch-induced downtime. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Incident labels missing for unreported breakages.

## 2. Choose the signals

Your strongest signal is **Patch vendor history** (past breakage rate). Its rule: Vendor tags. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.34% of the test period) and labels arrive weeks late. A model that always answers no would be 99.66% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.453 and finds 82.6% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.805 and 86.5%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.34% |
| Baseline PR-AUC | 0.453 |
| Baseline recall at 0.5% false positives | 82.6% |
| Challenger PR-AUC | 0.805 |
| Challenger recall at 0.5% false positives | 86.5% |

## 5. An edge case from the blueprint

**Zero-day emergency patching.** skips safety rings. Planned response: Emergency path with extra monitoring and fast rollback. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 160634 |
| `positive_rate` | 0.0034675 |
| `test_rows` | 53049 |
| `test_positive_rate` | 0.0033554 |
| `baseline_lr.pr_auc` | 0.45301 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.82584 |
| `baseline_lr.brier` | 0.005156 |
| `challenger_hgb.pr_auc` | 0.80548 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.86517 |
| `challenger_hgb.brier` | 0.0014118 |

</details>
