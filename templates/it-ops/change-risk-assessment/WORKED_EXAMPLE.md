# Change Risk Assessment: worked example

> Run on synthetic data with `tabular` engine, seed 28099, knobs {"n_entities": 2520, "positive_entity_rate": 0.038, "n_flash_sales": 6}, in 3.8 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Estimate the risk of a proposed change from its content, target and history so the approval route and test requirements match the risk, without blocking low-risk changes.

**Constraints that shape the design.** Risk shown with its drivers; Policy sets the approval route not the model alone; Calibrated probabilities

**Label in this use case.** For "Change Risk Assessment": Estimate the risk of a proposed change from its content, target and history so the approval route and test requirements match the risk, without blocking low-risk changes. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Requester scoring.

## 2. Choose the signals

Your strongest signal is **Target criticality** (tier of the affected services). Its rule: From the CMDB. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.51% of the test period) and labels arrive weeks late. A model that always answers no would be 99.49% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.509 and finds 70.2% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.736 and 74.1%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.51% |
| Baseline PR-AUC | 0.509 |
| Baseline recall at 0.5% false positives | 70.2% |
| Challenger PR-AUC | 0.736 |
| Challenger recall at 0.5% false positives | 74.1% |

## 5. An edge case from the blueprint

**New service.** no change history exists. Planned response: Tier-based priors. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 195023 |
| `positive_rate` | 0.0050148 |
| `test_rows` | 65576 |
| `test_positive_rate` | 0.0051238 |
| `baseline_lr.pr_auc` | 0.50931 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.70238 |
| `baseline_lr.brier` | 0.0061429 |
| `challenger_hgb.pr_auc` | 0.73648 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.74107 |
| `challenger_hgb.brier` | 0.0020714 |

</details>
