# Real-Time Bidding Bid Optimisation: worked example

> Run on synthetic data with `tabular` engine, seed 36641, knobs {"n_entities": 2210, "positive_entity_rate": 0.03, "n_flash_sales": 7}, in 2.0 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Compute the bid for every impression opportunity that maximises campaign value under budget and KPI constraints within the auction deadline.

**Constraints that shape the design.** Response under 8 ms of a 100 ms exchange timeout; 1M bid requests per second peak; Calibrated probabilities

**Label in this use case.** For "Real-Time Bidding Bid Optimisation": Compute the bid for every impression opportunity that maximises campaign value under budget and KPI constraints within the auction deadline. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training only on won impressions ignores the censored losing bids.

## 2. Choose the signals

Your strongest signal is **Calibrated pCVR** (predicted conversion probability after isotonic calibration). Its rule: Calibrate on delayed-feedback-corrected labels. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.39% of the test period) and labels arrive weeks late. A model that always answers no would be 99.61% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.685 and finds 74.8% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.727 and 76.6%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.39% |
| Baseline PR-AUC | 0.685 |
| Baseline recall at 0.5% false positives | 74.8% |
| Challenger PR-AUC | 0.727 |
| Challenger recall at 0.5% false positives | 76.6% |

## 5. An edge case from the blueprint

**Exchange changes auction type from second to first price.** bids systematically overpay for weeks. Planned response: Detect clearing-price shift and retrain win-price model with bid shading. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 170107 |
| `positive_rate` | 0.0038035 |
| `test_rows` | 56573 |
| `test_positive_rate` | 0.0039241 |
| `baseline_lr.pr_auc` | 0.68516 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.74775 |
| `baseline_lr.brier` | 0.0018407 |
| `challenger_hgb.pr_auc` | 0.72692 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.76577 |
| `challenger_hgb.brier` | 0.0017733 |

</details>
