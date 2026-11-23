# SIM-Box & Bypass Fraud Detection: worked example

> Run on synthetic data with `tabular` engine, seed 60242, knobs {"n_entities": 2140, "positive_entity_rate": 0.022, "n_flash_sales": 7}, in 3.4 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect SIM-box and interconnect bypass fraud from call patterns and network signalling, so illegal termination of international calls is found and blocked.

**Constraints that shape the design.** Features from call detail records only and never call content; Analyst confirmation before blocking a subscriber; Evidence pack for regulator and carrier disputes

**Label in this use case.** For "SIM-Box & Bypass Fraud Detection": Detect SIM-box and interconnect bypass fraud from call patterns and network signalling, so illegal termination of international calls is found and blocked. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Per-line analysis only.

## 2. Choose the signals

Your strongest signal is **Call fan-out and reciprocity** (distinct destinations versus inbound calls ratio). Its rule: Window per line. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.32% of the test period) and labels arrive weeks late. A model that always answers no would be 99.68% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.469 and finds 63.1% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.623 and 65.4%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.32% |
| Baseline PR-AUC | 0.469 |
| Baseline recall at 0.5% false positives | 63.1% |
| Challenger PR-AUC | 0.623 |
| Challenger recall at 0.5% false positives | 65.4% |

## 5. An edge case from the blueprint

**Legitimate call centre.** patterns look like bypass. Planned response: Verified business flags and a separate segment. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 167465 |
| `positive_rate` | 0.0027648 |
| `test_rows` | 56341 |
| `test_positive_rate` | 0.0031771 |
| `baseline_lr.pr_auc` | 0.46922 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.63128 |
| `baseline_lr.brier` | 0.0031679 |
| `challenger_hgb.pr_auc` | 0.62286 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.65363 |
| `challenger_hgb.brier` | 0.0016508 |

</details>
