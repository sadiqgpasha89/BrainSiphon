# Intraday Imbalance Risk Prediction: worked example

> Run on synthetic data with `multiclass` engine, seed 10940, knobs {"n": 14870, "label_noise": 0.077, "dup_share": 0.388}, in 3.2 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict the system imbalance direction and price risk for coming settlement periods so balancing responsible parties adjust positions before penalties hit.

**Constraints that shape the design.** Direction forecast for the next 8 periods; Calibrated probability of a penalty price; Update every 5 minutes

**Label in this use case.** For "Intraday Imbalance Risk Prediction": Predict the system imbalance direction and price risk for coming settlement periods so balancing responsible parties adjust positions before penalties hit. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using data after gate closure.

## 2. Choose the signals

Your strongest signal is **System frequency and area control error** (measured frequency deviation and error). Its rule: Live. In the starter, the closest executable idea is **separating feature (x1)**: the feature that best separates the classes. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Repeat entities on both sides of a random split inflate macro-F1 by 0.027. The rare class grows from 6.1% of training rows to 12.9% of the test period, so the prior drifts.

## 4. Baseline against the stronger design

Macro-F1 is 0.845 for the multinomial baseline and 0.836 for the boosted model; the baseline is ahead: the added complexity did not earn its place on this run. The confusable pair is mistaken 34.6% of the time by the baseline.

| Result | Value |
|---|---|
| Majority-class accuracy | 25.5% |
| Macro-F1, baseline | 0.845 |
| Macro-F1, challenger | 0.836 |
| Calibration error, baseline versus challenger | 0.013 vs 0.035 |
| Score inflation from a leaky random split | 0.027 |

## 5. An edge case from the blueprint

**Market rule change.** imbalance pricing is revised. Planned response: Versioned data and a re-fit. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 14870 |
| `train_rows` | 8281 |
| `test_rows` | 3718 |
| `majority_class_accuracy` | 0.25471 |
| `baseline_lr.macro_f1` | 0.84501 |
| `baseline_lr.accuracy` | 0.85503 |
| `baseline_lr.ece` | 0.012668 |
| `baseline_lr.recall_by_class` | 0.9778, 0.9857, 0.6856, 0.6033, 0.9646 |
| `baseline_lr.confusable_pair_error` | 0.34565 |
| `challenger_hgb.macro_f1` | 0.83607 |
| `challenger_hgb.accuracy` | 0.84723 |
| `challenger_hgb.ece` | 0.035249 |
| `challenger_hgb.recall_by_class` | 0.9757, 0.9857, 0.6814, 0.5714, 0.9583 |
| `challenger_hgb.confusable_pair_error` | 0.36087 |
| `random_split_challenger_macro_f1` | 0.8628 |
| `leaky_split_inflation` | 0.026729 |
| `test_class_shares` | 0.2547, 0.245, 0.1942, 0.177, 0.1291 |
| `train_class_shares` | 0.332, 0.2546, 0.1865, 0.1663, 0.06074 |

</details>
