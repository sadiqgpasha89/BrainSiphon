# Device Posture & Vulnerability Risk Scoring: worked example

> Run on synthetic data with `tabular` engine, seed 42875, knobs {"n_entities": 1870, "positive_entity_rate": 0.036, "n_flash_sales": 6}, in 1.4 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Score every managed device's security posture and likelihood of compromise to drive remediation and access policy.

**Constraints that shape the design.** Millions of devices; Heterogeneous agents; Explainable remediation

**Label in this use case.** For "Device Posture & Vulnerability Risk Scoring": Score every managed device's security posture and likelihood of compromise to drive remediation and access policy. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels reflect detection capability not true compromise.

## 2. Choose the signals

Your strongest signal is **Unpatched exploited vulnerabilities** (count of KEV-listed vulns). Its rule: Scan freshness. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.43% of the test period) and labels arrive weeks late. A model that always answers no would be 99.57% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.804 and finds 82.6% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.820 and 81.7%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.43% |
| Baseline PR-AUC | 0.804 |
| Baseline recall at 0.5% false positives | 82.6% |
| Challenger PR-AUC | 0.820 |
| Challenger recall at 0.5% false positives | 81.7% |

## 5. An edge case from the blueprint

**Agent outage makes devices look unprotected.** mass false risk. Planned response: Agent-health separation and freshness flags. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 147836 |
| `positive_rate` | 0.0048094 |
| `test_rows` | 50183 |
| `test_positive_rate` | 0.0043441 |
| `baseline_lr.pr_auc` | 0.80406 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.82569 |
| `baseline_lr.brier` | 0.0017703 |
| `challenger_hgb.pr_auc` | 0.82011 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.81651 |
| `challenger_hgb.brier` | 0.0013778 |

</details>
