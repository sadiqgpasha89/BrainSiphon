# Transformer DGA Fault Classification: worked example

> Run on synthetic data with `multiclass` engine, seed 79475, knobs {"n": 15150, "label_noise": 0.05, "dup_share": 0.387}, in 3.4 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Classify the likely fault type in a transformer from dissolved gas trends and online monitors so the right inspection or outage is planned.

**Constraints that shape the design.** Fault class with confidence; Trend and rate-of-change alerts; Engineers confirm before action

**Label in this use case.** For "Transformer DGA Fault Classification": Classify the likely fault type in a transformer from dissolved gas trends and online monitors so the right inspection or outage is planned. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Ratio methods alone.

## 2. Choose the signals

Your strongest signal is **Gas concentrations** (levels of key gases). Its rule: From lab or monitor. In the starter, the closest executable idea is **separating feature (x1)**: the feature that best separates the classes. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Repeat entities on both sides of a random split inflate macro-F1 by 0.003. The rare class grows from 6.1% of training rows to 13.7% of the test period, so the prior drifts.

## 4. Baseline against the stronger design

Macro-F1 is 0.864 for the multinomial baseline and 0.848 for the boosted model; the baseline is ahead: the added complexity did not earn its place on this run. The confusable pair is mistaken 24.1% of the time by the baseline.

| Result | Value |
|---|---|
| Majority-class accuracy | 27.0% |
| Macro-F1, baseline | 0.864 |
| Macro-F1, challenger | 0.848 |
| Calibration error, baseline versus challenger | 0.018 vs 0.029 |
| Score inflation from a leaky random split | 0.003 |

## 5. An edge case from the blueprint

**Sampling error.** a contaminated sample shows odd gases. Planned response: Outlier checks and resampling advice. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 15150 |
| `train_rows` | 8327 |
| `test_rows` | 3788 |
| `majority_class_accuracy` | 0.26954 |
| `baseline_lr.macro_f1` | 0.86414 |
| `baseline_lr.accuracy` | 0.87777 |
| `baseline_lr.ece` | 0.0185 |
| `baseline_lr.recall_by_class` | 0.9922, 0.9863, 0.7399, 0.6948, 0.8885 |
| `baseline_lr.confusable_pair_error` | 0.2407 |
| `challenger_hgb.macro_f1` | 0.84791 |
| `challenger_hgb.accuracy` | 0.86167 |
| `challenger_hgb.ece` | 0.02873 |
| `challenger_hgb.recall_by_class` | 0.9863, 0.9783, 0.7049, 0.663, 0.8846 |
| `challenger_hgb.confusable_pair_error` | 0.27717 |
| `random_split_challenger_macro_f1` | 0.85047 |
| `leaky_split_inflation` | 0.0025556 |
| `test_class_shares` | 0.2695, 0.2313, 0.1959, 0.1661, 0.1373 |
| `train_class_shares` | 0.3199, 0.2642, 0.1937, 0.1609, 0.06125 |

</details>
