# API Abuse & Bot Detection: worked example

> Run on synthetic data with `tabular` engine, seed 66306, knobs {"n_entities": 1890, "positive_entity_rate": 0.027, "n_flash_sales": 7}, in 1.3 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect scraping, enumeration and business-logic abuse on APIs while preserving legitimate integrations.

**Constraints that shape the design.** Sub-20 ms decisions; Partner integrations must not break; Adaptive attackers

**Label in this use case.** For "API Abuse & Bot Detection": Detect scraping, enumeration and business-logic abuse on APIs while preserving legitimate integrations. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels only from detected bots.

## 2. Choose the signals

Your strongest signal is **Endpoint sequence entropy** (entropy of API-call sequences). Its rule: Session windows. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.51% of the test period) and labels arrive weeks late. A model that always answers no would be 99.49% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.718 and finds 83.7% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.868 and 86.9%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.51% |
| Baseline PR-AUC | 0.718 |
| Baseline recall at 0.5% false positives | 83.7% |
| Challenger PR-AUC | 0.868 |
| Challenger recall at 0.5% false positives | 86.9% |

## 5. An edge case from the blueprint

**Large legitimate partner bursts.** misclassified as scraping. Planned response: Partner baselines and contractual rate profiles. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 146764 |
| `positive_rate` | 0.003877 |
| `test_rows` | 48965 |
| `test_positive_rate` | 0.0051261 |
| `baseline_lr.pr_auc` | 0.71767 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.83665 |
| `baseline_lr.brier` | 0.0033695 |
| `challenger_hgb.pr_auc` | 0.86782 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.86853 |
| `challenger_hgb.brier` | 0.0015264 |

</details>
