# Distribution Outage Prediction: worked example

> Run on synthetic data with `multiclass` engine, seed 6788, knobs {"n": 11040, "label_noise": 0.068, "dup_share": 0.422}, in 3.0 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict the chance of outages on each feeder section over the next days from weather, vegetation, asset age and history, so crews and spares are pre-positioned before storms.

**Constraints that shape the design.** Risk score per feeder section for 72 hours ahead; Calibrated probabilities for crew planning; Refresh every 3 hours during weather alerts

**Label in this use case.** For "Distribution Outage Prediction": Predict the chance of outages on each feeder section over the next days from weather, vegetation, asset age and history, so crews and spares are pre-positioned before storms. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using customer calls as labels.

## 2. Choose the signals

Your strongest signal is **Forecast wind gust and lightning** (forecast gust speed and strike density at the section). Its rule: Interpolated to sections. In the starter, the closest executable idea is **separating feature (x1)**: the feature that best separates the classes. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Repeat entities on both sides of a random split inflate macro-F1 by 0.036. The rare class grows from 5.5% of training rows to 15.2% of the test period, so the prior drifts.

## 4. Baseline against the stronger design

Macro-F1 is 0.809 for the multinomial baseline and 0.773 for the boosted model; the baseline is ahead: the added complexity did not earn its place on this run. The confusable pair is mistaken 24.4% of the time by the baseline.

| Result | Value |
|---|---|
| Majority-class accuracy | 26.3% |
| Macro-F1, baseline | 0.809 |
| Macro-F1, challenger | 0.773 |
| Calibration error, baseline versus challenger | 0.022 vs 0.056 |
| Score inflation from a leaky random split | 0.036 |

## 5. An edge case from the blueprint

**Unprecedented storm.** the event is outside the training range. Planned response: Wider intervals and a rule-based severity floor. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 11040 |
| `train_rows` | 5808 |
| `test_rows` | 2760 |
| `majority_class_accuracy` | 0.26341 |
| `baseline_lr.macro_f1` | 0.8086 |
| `baseline_lr.accuracy` | 0.81812 |
| `baseline_lr.ece` | 0.02164 |
| `baseline_lr.recall_by_class` | 0.967, 0.8693, 0.6571, 0.65, 0.8783 |
| `baseline_lr.confusable_pair_error` | 0.24351 |
| `challenger_hgb.macro_f1` | 0.77306 |
| `challenger_hgb.accuracy` | 0.78478 |
| `challenger_hgb.ece` | 0.055688 |
| `challenger_hgb.recall_by_class` | 0.9532, 0.8497, 0.6188, 0.5771, 0.8425 |
| `challenger_hgb.confusable_pair_error` | 0.3004 |
| `random_split_challenger_macro_f1` | 0.80907 |
| `leaky_split_inflation` | 0.036018 |
| `test_class_shares` | 0.2634, 0.2217, 0.1891, 0.1739, 0.1518 |
| `train_class_shares` | 0.3382, 0.2497, 0.1949, 0.1625, 0.05475 |

</details>
