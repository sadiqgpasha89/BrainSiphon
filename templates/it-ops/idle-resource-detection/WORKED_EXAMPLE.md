# Idle Resource Detection: worked example

> Run on synthetic data with `tabular` engine, seed 48367, knobs {"n_entities": 2580, "positive_entity_rate": 0.032, "n_flash_sales": 8}, in 3.8 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Find unused servers, volumes, snapshots and test environments from activity and ownership data and propose scheduled shutdown or deletion with owner confirmation.

**Constraints that shape the design.** Owners confirm before deletion; Resources stopped before deleted; Backups taken before deletion

**Label in this use case.** For "Idle Resource Detection": Find unused servers, volumes, snapshots and test environments from activity and ownership data and propose scheduled shutdown or deletion with owner confirmation. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: CPU-only evidence.

## 2. Choose the signals

Your strongest signal is **Activity over 30 days** (network, CPU and logins). Its rule: From monitoring. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.36% of the test period) and labels arrive weeks late. A model that always answers no would be 99.64% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.815 and finds 86.8% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.830 and 88.0%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.36% |
| Baseline PR-AUC | 0.815 |
| Baseline recall at 0.5% false positives | 86.8% |
| Challenger PR-AUC | 0.830 |
| Challenger recall at 0.5% false positives | 88.0% |

## 5. An edge case from the blueprint

**Disaster recovery systems.** standby systems look idle but are needed for recovery. Planned response: Tag and allow-list. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 200606 |
| `positive_rate` | 0.0043269 |
| `test_rows` | 66848 |
| `test_positive_rate` | 0.0036202 |
| `baseline_lr.pr_auc` | 0.81457 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.86777 |
| `baseline_lr.brier` | 0.0013379 |
| `challenger_hgb.pr_auc` | 0.82995 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.88017 |
| `challenger_hgb.brier` | 0.0011827 |

</details>
