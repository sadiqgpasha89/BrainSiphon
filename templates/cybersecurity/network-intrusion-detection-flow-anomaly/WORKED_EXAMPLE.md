# Network Intrusion Detection via Flow Anomalies: worked example

> Run on synthetic data with `tabular` engine, seed 32307, knobs {"n_entities": 2670, "positive_entity_rate": 0.041, "n_flash_sales": 8}, in 1.8 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect lateral movement, scanning and command-and-control from network flow metadata at line rate, including in encrypted traffic.

**Constraints that shape the design.** 100 Gbps links; Encrypted payloads invisible; Alert precision for SOC

**Label in this use case.** For "Network Intrusion Detection via Flow Anomalies": Detect lateral movement, scanning and command-and-control from network flow metadata at line rate, including in encrypted traffic. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on public datasets with unrealistic attacks.

## 2. Choose the signals

Your strongest signal is **Fan-out and new-destination rate** (distinct new peers per host per hour). Its rule: Window and baseline exclude the alert. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.75% of the test period) and labels arrive weeks late. A model that always answers no would be 99.25% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.774 and finds 77.9% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.807 and 80.8%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.75% |
| Baseline PR-AUC | 0.774 |
| Baseline recall at 0.5% false positives | 77.9% |
| Challenger PR-AUC | 0.807 |
| Challenger recall at 0.5% false positives | 80.8% |

## 5. An edge case from the blueprint

**New backup job creates huge uploads.** exfiltration alerts fire on a legitimate scheduled transfer. Planned response: Change-calendar integration and per-role baselines with maintenance windows. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 206302 |
| `positive_rate` | 0.0057925 |
| `test_rows` | 68384 |
| `test_positive_rate` | 0.007531 |
| `baseline_lr.pr_auc` | 0.77376 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.77908 |
| `baseline_lr.brier` | 0.0027398 |
| `challenger_hgb.pr_auc` | 0.80731 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.80777 |
| `challenger_hgb.brier` | 0.0027717 |

</details>
