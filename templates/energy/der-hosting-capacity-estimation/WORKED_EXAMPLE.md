# DER Hosting Capacity Estimation: worked example

> Run on synthetic data with `tabular` engine, seed 33215, knobs {"n_entities": 2760, "positive_entity_rate": 0.032, "n_flash_sales": 4}, in 4.1 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Estimate how much solar, storage or charging load each feeder location can host without breaching limits, so connection offers are faster and upgrades are targeted.

**Constraints that shape the design.** Capacity by node with a confidence range; Conservative when uncertain; Recompute on network changes

**Label in this use case.** For "DER Hosting Capacity Estimation": Estimate how much solar, storage or charging load each feeder location can host without breaching limits, so connection offers are faster and upgrades are targeted. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Point estimates with no margin.

## 2. Choose the signals

Your strongest signal is **Upstream impedance** (electrical distance to the substation). Its rule: From the network model. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.52% of the test period) and labels arrive weeks late. A model that always answers no would be 99.48% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.515 and finds 71.4% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.768 and 79.4%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.52% |
| Baseline PR-AUC | 0.515 |
| Baseline recall at 0.5% false positives | 71.4% |
| Challenger PR-AUC | 0.768 |
| Challenger recall at 0.5% false positives | 79.4% |

## 5. An edge case from the blueprint

**Network change.** a new feeder tie alters the map. Planned response: Trigger recomputation on topology edits. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 205698 |
| `positive_rate` | 0.0046233 |
| `test_rows` | 67769 |
| `test_positive_rate` | 0.0051646 |
| `baseline_lr.pr_auc` | 0.51518 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.71429 |
| `baseline_lr.brier` | 0.0051925 |
| `challenger_hgb.pr_auc` | 0.76842 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.79429 |
| `challenger_hgb.brier` | 0.0020049 |

</details>
