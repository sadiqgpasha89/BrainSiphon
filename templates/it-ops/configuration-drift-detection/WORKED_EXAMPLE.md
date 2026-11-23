# Configuration Drift Detection: worked example

> Run on synthetic data with `tabular` engine, seed 64340, knobs {"n_entities": 2220, "positive_entity_rate": 0.038, "n_flash_sales": 7}, in 3.5 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Compare running configuration with the approved baseline from infrastructure code, detect drift and classify it as harmless, risky or unauthorised for owners to fix or accept.

**Constraints that shape the design.** Drift reports within 1 hour of detection; Security-relevant drift alerted to security; Owners decide to revert or accept

**Label in this use case.** For "Configuration Drift Detection": Compare running configuration with the approved baseline from infrastructure code, detect drift and classify it as harmless, risky or unauthorised for owners to fix or accept. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Last seen state as baseline.

## 2. Choose the signals

Your strongest signal is **Setting difference** (declared versus actual value). Its rule: From scans. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.34% of the test period) and labels arrive weeks late. A model that always answers no would be 99.66% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.617 and finds 78.5% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.730 and 77.9%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.34% |
| Baseline PR-AUC | 0.617 |
| Baseline recall at 0.5% false positives | 78.5% |
| Challenger PR-AUC | 0.730 |
| Challenger recall at 0.5% false positives | 77.9% |

## 5. An edge case from the blueprint

**Auto-managed settings.** the platform changes values itself. Planned response: Ignore lists by setting. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 171135 |
| `positive_rate` | 0.0051538 |
| `test_rows` | 56725 |
| `test_positive_rate` | 0.0034376 |
| `baseline_lr.pr_auc` | 0.6171 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.78462 |
| `baseline_lr.brier` | 0.0045713 |
| `challenger_hgb.pr_auc` | 0.73036 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.77949 |
| `challenger_hgb.brier` | 0.0014719 |

</details>
