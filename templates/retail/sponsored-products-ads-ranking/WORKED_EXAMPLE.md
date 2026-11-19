# Sponsored Products Ads Ranking: worked example

> Run on synthetic data with `tabular` engine, seed 72936, knobs {"n_entities": 2360, "positive_entity_rate": 0.037, "n_flash_sales": 7}, in 1.6 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Rank sponsored listings in marketplace search by expected value to buyer, seller and platform in a second-price style auction.

**Constraints that shape the design.** Calibrated pCTR/pCVR for billing; Relevance floor for ads; Auction latency 30 ms

**Label in this use case.** For "Sponsored Products Ads Ranking": Rank sponsored listings in marketplace search by expected value to buyer, seller and platform in a second-price style auction. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Click logs shaped by the incumbent auction.

## 2. Choose the signals

Your strongest signal is **Query-ad relevance** (cross-encoder relevance score). Its rule: Same model as organic. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.42% of the test period) and labels arrive weeks late. A model that always answers no would be 99.58% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.559 and finds 72.6% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.741 and 78.0%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.42% |
| Baseline PR-AUC | 0.559 |
| Baseline recall at 0.5% false positives | 72.6% |
| Challenger PR-AUC | 0.741 |
| Challenger recall at 0.5% false positives | 78.0% |

## 5. An edge case from the blueprint

**New advertiser with no history.** CTR estimates unstable. Planned response: Hierarchical priors and exploration budgets. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 184271 |
| `positive_rate` | 0.0048298 |
| `test_rows` | 62321 |
| `test_positive_rate` | 0.0041559 |
| `baseline_lr.pr_auc` | 0.55918 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.72587 |
| `baseline_lr.brier` | 0.0040356 |
| `challenger_hgb.pr_auc` | 0.74142 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.77992 |
| `challenger_hgb.brier` | 0.0017087 |

</details>
