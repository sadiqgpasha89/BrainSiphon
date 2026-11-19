# E-Commerce Checkout Risk (Card-Not-Present): worked example

> Run on synthetic data with `tabular` engine, seed 86855, knobs {"n_entities": 2590, "positive_entity_rate": 0.044, "n_flash_sales": 4}, in 1.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Approve genuine orders instantly and block fraudulent card-not-present orders before fulfilment, optimising profit not just fraud rate.

**Constraints that shape the design.** Decision under 70 ms; Chargeback ratio under scheme limits; 3DS step-up budget

**Label in this use case.** For "E-Commerce Checkout Risk (Card-Not-Present)": Approve genuine orders instantly and block fraudulent card-not-present orders before fulfilment, optimising profit not just fraud rate. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on approved orders only.

## 2. Choose the signals

Your strongest signal is **Shipping-billing distance** (geodesic distance and mismatch flags). Its rule: Address normalisation as-of. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.52% of the test period) and labels arrive weeks late. A model that always answers no would be 99.48% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.682 and finds 72.2% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.752 and 74.8%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.52% |
| Baseline PR-AUC | 0.682 |
| Baseline recall at 0.5% false positives | 72.2% |
| Challenger PR-AUC | 0.752 |
| Challenger recall at 0.5% false positives | 74.8% |

## 5. An edge case from the blueprint

**Chargeback labels arrive 60 days late.** recent patterns unlabelled. Planned response: Early-signal proxy labels and survival correction. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 196977 |
| `positive_rate` | 0.0059449 |
| `test_rows` | 65730 |
| `test_positive_rate` | 0.0052487 |
| `baseline_lr.pr_auc` | 0.68228 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.72174 |
| `baseline_lr.brier` | 0.0028956 |
| `challenger_hgb.pr_auc` | 0.75165 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.74783 |
| `challenger_hgb.brier` | 0.0021004 |

</details>
