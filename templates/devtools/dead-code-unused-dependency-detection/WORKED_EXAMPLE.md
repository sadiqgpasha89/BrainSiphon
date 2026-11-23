# Dead Code and Unused Dependency Detection: worked example

> Run on synthetic data with `tabular` engine, seed 88566, knobs {"n_entities": 2120, "positive_entity_rate": 0.043, "n_flash_sales": 7}, in 3.2 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Find code, feature flags and dependencies that are no longer used by combining static analysis with production usage data, and propose safe removals for owners to approve.

**Constraints that shape the design.** Removal proposals include runtime evidence over 90 days; Owners approve every removal; Reflection and plugin entry points handled

**Label in this use case.** For "Dead Code and Unused Dependency Detection": Find code, feature flags and dependencies that are no longer used by combining static analysis with production usage data, and propose safe removals for owners to approve. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Static analysis alone.

## 2. Choose the signals

Your strongest signal is **Static reachability** (whether code is reachable from entry points). Its rule: From analysis. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.76% of the test period) and labels arrive weeks late. A model that always answers no would be 99.24% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.757 and finds 72.9% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.803 and 78.8%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.76% |
| Baseline PR-AUC | 0.757 |
| Baseline recall at 0.5% false positives | 72.9% |
| Challenger PR-AUC | 0.803 |
| Challenger recall at 0.5% false positives | 78.8% |

## 5. An edge case from the blueprint

**Rare scheduled job.** the code runs once a year. Planned response: Calendar-aware windows and owner checks. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 160663 |
| `positive_rate` | 0.0061059 |
| `test_rows` | 53273 |
| `test_positive_rate` | 0.0076024 |
| `baseline_lr.pr_auc` | 0.7568 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.72923 |
| `baseline_lr.brier` | 0.0031256 |
| `challenger_hgb.pr_auc` | 0.80277 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.78765 |
| `challenger_hgb.brier` | 0.002791 |

</details>
