# API Breaking Change Detection: worked example

> Run on synthetic data with `tabular` engine, seed 31725, knobs {"n_entities": 2420, "positive_entity_rate": 0.037, "n_flash_sales": 6}, in 3.7 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect changes in API schemas and behaviour that would break consumers and warn authors in the pull request with the list of affected clients.

**Constraints that shape the design.** Breaking changes flagged in the pull request; Affected consumers listed from traces and registries; Owners decide on exceptions

**Label in this use case.** For "API Breaking Change Detection": Detect changes in API schemas and behaviour that would break consumers and warn authors in the pull request with the list of affected clients. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Textual diffs only.

## 2. Choose the signals

Your strongest signal is **Schema diff classification** (removed, renamed or type-changed fields). Its rule: From schema tools. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.40% of the test period) and labels arrive weeks late. A model that always answers no would be 99.60% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.709 and finds 77.1% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.764 and 79.5%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.40% |
| Baseline PR-AUC | 0.709 |
| Baseline recall at 0.5% false positives | 77.1% |
| Challenger PR-AUC | 0.764 |
| Challenger recall at 0.5% false positives | 79.5% |

## 5. An edge case from the blueprint

**Behavioural change.** the schema is unchanged but behaviour differs. Planned response: Contract tests and example checks. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 188433 |
| `positive_rate` | 0.0052061 |
| `test_rows` | 61840 |
| `test_positive_rate` | 0.0040265 |
| `baseline_lr.pr_auc` | 0.70935 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.77108 |
| `baseline_lr.brier` | 0.0022248 |
| `challenger_hgb.pr_auc` | 0.76375 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.79518 |
| `challenger_hgb.brier` | 0.0015748 |

</details>
