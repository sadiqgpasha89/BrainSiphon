# Pedestrian Safety Intervention Ranking: worked example

> Run on synthetic data with `tabular` engine, seed 12047, knobs {"n_entities": 2820, "positive_entity_rate": 0.033, "n_flash_sales": 8}, in 4.2 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Rank crossings and streets for safety treatments by estimated crash risk reduction per cost, so budgets go to the interventions that save most lives.

**Constraints that shape the design.** Benefit-cost ranking with uncertainty; Equity weighting for areas with less safe infrastructure; Engineers and communities review lists

**Label in this use case.** For "Pedestrian Safety Intervention Ranking": Rank crossings and streets for safety treatments by estimated crash risk reduction per cost, so budgets go to the interventions that save most lives. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Crash counts as the objective.

## 2. Choose the signals

Your strongest signal is **Pedestrian exposure** (pedestrian volumes). Its rule: From counts. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.39% of the test period) and labels arrive weeks late. A model that always answers no would be 99.61% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.721 and finds 75.1% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.771 and 80.4%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.39% |
| Baseline PR-AUC | 0.721 |
| Baseline recall at 0.5% false positives | 75.1% |
| Challenger PR-AUC | 0.771 |
| Challenger recall at 0.5% false positives | 80.4% |

## 5. An edge case from the blueprint

**Low exposure data.** pedestrian counts are missing. Planned response: Estimated exposure with flags. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 218978 |
| `positive_rate` | 0.0042059 |
| `test_rows` | 72385 |
| `test_positive_rate` | 0.003882 |
| `baseline_lr.pr_auc` | 0.7212 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.75089 |
| `baseline_lr.brier` | 0.0018707 |
| `challenger_hgb.pr_auc` | 0.77107 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.80427 |
| `challenger_hgb.brier` | 0.0014904 |

</details>
