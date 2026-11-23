# Bid and No-Bid Decision Support: worked example

> Run on synthetic data with `tabular` engine, seed 62087, knobs {"n_entities": 2770, "positive_entity_rate": 0.032, "n_flash_sales": 3}, in 4.1 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Score tender opportunities on win probability, margin, risk and fit with capacity and strategy so bid committees choose which tenders to pursue, with the evidence shown.

**Constraints that shape the design.** Committee decides; Scores show drivers; Client and bid data kept in segregated workspaces

**Label in this use case.** For "Bid and No-Bid Decision Support": Score tender opportunities on win probability, margin, risk and fit with capacity and strategy so bid committees choose which tenders to pursue, with the evidence shown. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Win rate as value.

## 2. Choose the signals

Your strongest signal is **Client and competition** (repeat client and competitor set). Its rule: From records. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.54% of the test period) and labels arrive weeks late. A model that always answers no would be 99.46% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.819 and finds 84.6% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.841 and 84.6%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.54% |
| Baseline PR-AUC | 0.819 |
| Baseline recall at 0.5% false positives | 84.6% |
| Challenger PR-AUC | 0.841 |
| Challenger recall at 0.5% false positives | 84.6% |

## 5. An edge case from the blueprint

**New market.** there is no history. Planned response: Qualitative review. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 212269 |
| `positive_rate` | 0.0042776 |
| `test_rows` | 70475 |
| `test_positive_rate` | 0.0054204 |
| `baseline_lr.pr_auc` | 0.81938 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.84555 |
| `baseline_lr.brier` | 0.0017121 |
| `challenger_hgb.pr_auc` | 0.84053 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.84555 |
| `challenger_hgb.brier` | 0.0015447 |

</details>
