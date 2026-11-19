# Zero-Trust Adaptive Authentication: worked example

> Run on synthetic data with `tabular` engine, seed 1114, knobs {"n_entities": 2100, "positive_entity_rate": 0.026, "n_flash_sales": 4}, in 1.3 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Continuously score session risk and adapt authentication requirements per request using device, user and resource signals.

**Constraints that shape the design.** Decision under 30 ms; Policy transparency; Friction budget

**Label in this use case.** For "Zero-Trust Adaptive Authentication": Continuously score session risk and adapt authentication requirements per request using device, user and resource signals. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels from confirmed incidents only.

## 2. Choose the signals

Your strongest signal is **Device posture score** (patch level, EDR status). Its rule: Agent. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.35% of the test period) and labels arrive weeks late. A model that always answers no would be 99.65% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.597 and finds 67.4% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.644 and 69.0%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.35% |
| Baseline PR-AUC | 0.597 |
| Baseline recall at 0.5% false positives | 67.4% |
| Challenger PR-AUC | 0.644 |
| Challenger recall at 0.5% false positives | 69.0% |

## 5. An edge case from the blueprint

**Device posture agent crashes.** healthy devices appear untrusted. Planned response: Grace states and posture-staleness handling. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 155712 |
| `positive_rate` | 0.0036028 |
| `test_rows` | 52320 |
| `test_positive_rate` | 0.0035168 |
| `baseline_lr.pr_auc` | 0.5973 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.67391 |
| `baseline_lr.brier` | 0.0022086 |
| `challenger_hgb.pr_auc` | 0.64424 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.69022 |
| `challenger_hgb.brier` | 0.0017722 |

</details>
