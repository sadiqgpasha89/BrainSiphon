# Corporate Obligor Rating Migration Prediction: worked example

> Run on synthetic data with `multiclass` engine, seed 12638, knobs {"n": 14330, "label_noise": 0.073, "dup_share": 0.284}, in 1.9 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict the probability that a corporate borrower's internal rating moves up or down within 12 months to guide limits, pricing and watchlists.

**Constraints that shape the design.** Ratings remain explainable and monotone in key drivers; Credit committee override recorded; Quarterly refresh

**Label in this use case.** For "Corporate Obligor Rating Migration Prediction": Predict the probability that a corporate borrower's internal rating moves up or down within 12 months to guide limits, pricing and watchlists. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Pooling cycles in a random split understates downturn risk.

## 2. Choose the signals

Your strongest signal is **Rating age and prior moves** (months since last review and number of changes in 24 months). Its rule: Review dates may be late. In the starter, the closest executable idea is **separating feature (x1)**: the feature that best separates the classes. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Repeat entities on both sides of a random split inflate macro-F1 by 0.019. The rare class grows from 5.7% of training rows to 16.6% of the test period, so the prior drifts.

## 4. Baseline against the stronger design

Macro-F1 is 0.846 for the multinomial baseline and 0.821 for the boosted model; the baseline is ahead: the added complexity did not earn its place on this run. The confusable pair is mistaken 31.5% of the time by the baseline.

| Result | Value |
|---|---|
| Majority-class accuracy | 25.2% |
| Macro-F1, baseline | 0.846 |
| Macro-F1, challenger | 0.821 |
| Calibration error, baseline versus challenger | 0.014 vs 0.035 |
| Score inflation from a leaky random split | 0.019 |

## 5. An edge case from the blueprint

**Merger or demerger.** the entity changes and history no longer applies. Planned response: Use a legal-entity graph and restart features on the new entity. Write the test that replays this case through your pipeline before you tune anything.

## 6. What to expect on your own data

Choose by per-class recall for the classes that cost the most, not by accuracy. Keep the entity-safe chronological split.

## 7. Do this next

1. `cd starter && make setup && make demo` to reproduce the table above.
2. Replace the synthetic generator with an extract of your data and keep the split, the leakage tests and the gates.
3. Run through `docs/02-delivery-plan.md` milestone by milestone; each exit gate is a number you can check.

<details>
<summary>Every number from this run</summary>

| Metric | Value |
|---|---|
| `rows` | 14330 |
| `train_rows` | 8983 |
| `test_rows` | 3583 |
| `majority_class_accuracy` | 0.2523 |
| `baseline_lr.macro_f1` | 0.84587 |
| `baseline_lr.accuracy` | 0.8585 |
| `baseline_lr.ece` | 0.014435 |
| `baseline_lr.recall_by_class` | 0.9801, 0.9987, 0.7005, 0.6305, 0.9073 |
| `baseline_lr.confusable_pair_error` | 0.31457 |
| `challenger_hgb.macro_f1` | 0.8208 |
| `challenger_hgb.accuracy` | 0.83505 |
| `challenger_hgb.ece` | 0.03516 |
| `challenger_hgb.recall_by_class` | 0.9746, 0.9975, 0.6369, 0.5865, 0.8938 |
| `challenger_hgb.confusable_pair_error` | 0.36392 |
| `random_split_challenger_macro_f1` | 0.8394 |
| `leaky_split_inflation` | 0.018593 |
| `test_class_shares` | 0.2523, 0.2202, 0.1845, 0.1775, 0.1655 |
| `train_class_shares` | 0.3386, 0.2528, 0.1832, 0.1679, 0.05744 |

</details>
