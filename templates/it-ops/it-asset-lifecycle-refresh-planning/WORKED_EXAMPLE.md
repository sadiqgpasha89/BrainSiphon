# IT Asset Lifecycle and Refresh Planning: worked example

> Run on synthetic data with `multiclass` engine, seed 8503, knobs {"n": 12020, "label_noise": 0.061, "dup_share": 0.364}, in 2.9 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast device and server refresh needs from age, failure risk and support dates and plan purchases and disposal across the year within budget.

**Constraints that shape the design.** Refresh plans within the approved budget; Data wiped and certified at disposal; Finance approves purchases

**Label in this use case.** For "IT Asset Lifecycle and Refresh Planning": Forecast device and server refresh needs from age, failure risk and support dates and plan purchases and disposal across the year within budget. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Age-only cycles.

## 2. Choose the signals

Your strongest signal is **Failure risk** (predicted failure probability). Its rule: From device models. In the starter, the closest executable idea is **separating feature (x1)**: the feature that best separates the classes. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Repeat entities on both sides of a random split inflate macro-F1 by 0.040. The rare class grows from 5.9% of training rows to 14.8% of the test period, so the prior drifts.

## 4. Baseline against the stronger design

Macro-F1 is 0.826 for the multinomial baseline and 0.811 for the boosted model; the baseline is ahead: the added complexity did not earn its place on this run. The confusable pair is mistaken 31.8% of the time by the baseline.

| Result | Value |
|---|---|
| Majority-class accuracy | 27.4% |
| Macro-F1, baseline | 0.826 |
| Macro-F1, challenger | 0.811 |
| Calibration error, baseline versus challenger | 0.020 vs 0.053 |
| Score inflation from a leaky random split | 0.040 |

## 5. An edge case from the blueprint

**Supply delay.** devices arrive late. Planned response: Buffers and phased waves. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 12020 |
| `train_rows` | 6878 |
| `test_rows` | 3005 |
| `majority_class_accuracy` | 0.27421 |
| `baseline_lr.macro_f1` | 0.82568 |
| `baseline_lr.accuracy` | 0.83461 |
| `baseline_lr.ece` | 0.019993 |
| `baseline_lr.recall_by_class` | 0.9369, 0.9057, 0.7449, 0.6056, 0.9169 |
| `baseline_lr.confusable_pair_error` | 0.31772 |
| `challenger_hgb.macro_f1` | 0.81093 |
| `challenger_hgb.accuracy` | 0.8203 |
| `challenger_hgb.ece` | 0.05271 |
| `challenger_hgb.recall_by_class` | 0.9308, 0.9026, 0.7027, 0.5875, 0.9124 |
| `challenger_hgb.confusable_pair_error` | 0.34803 |
| `random_split_challenger_macro_f1` | 0.85107 |
| `leaky_split_inflation` | 0.040137 |
| `test_class_shares` | 0.2742, 0.2153, 0.197, 0.1654, 0.1481 |
| `train_class_shares` | 0.3228, 0.2528, 0.1996, 0.1657, 0.05903 |

</details>
