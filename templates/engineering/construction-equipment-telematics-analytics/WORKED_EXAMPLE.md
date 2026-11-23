# Construction Equipment Telematics Analytics: worked example

> Run on synthetic data with `multiclass` engine, seed 44116, knobs {"n": 15530, "label_noise": 0.083, "dup_share": 0.313}, in 2.8 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Use equipment telemetry to estimate utilisation, idle time, fuel use and maintenance needs by machine type and site so fleets are planned and serviced better, without scoring operators.

**Constraints that shape the design.** Analysis at machine and fleet level; No operator ranking; Maintenance alerts at least 7 days ahead

**Label in this use case.** For "Construction Equipment Telematics Analytics": Use equipment telemetry to estimate utilisation, idle time, fuel use and maintenance needs by machine type and site so fleets are planned and serviced better, without scoring operators. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Operator ranking.

## 2. Choose the signals

Your strongest signal is **Engine and hydraulic telemetry** (temperatures, pressures and hours). Its rule: From telematics. In the starter, the closest executable idea is **separating feature (x1)**: the feature that best separates the classes. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Repeat entities on both sides of a random split inflate macro-F1 by 0.038. The rare class grows from 5.7% of training rows to 15.0% of the test period, so the prior drifts.

## 4. Baseline against the stronger design

Macro-F1 is 0.717 for the multinomial baseline and 0.708 for the boosted model; the baseline is ahead: the added complexity did not earn its place on this run. The confusable pair is mistaken 32.8% of the time by the baseline.

| Result | Value |
|---|---|
| Majority-class accuracy | 26.1% |
| Macro-F1, baseline | 0.717 |
| Macro-F1, challenger | 0.708 |
| Calibration error, baseline versus challenger | 0.025 vs 0.058 |
| Score inflation from a leaky random split | 0.038 |

## 5. An edge case from the blueprint

**Missing signals.** machines lose connectivity. Planned response: Store and forward. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 15530 |
| `train_rows` | 9507 |
| `test_rows` | 3883 |
| `majority_class_accuracy` | 0.26088 |
| `baseline_lr.macro_f1` | 0.71658 |
| `baseline_lr.accuracy` | 0.75509 |
| `baseline_lr.ece` | 0.025469 |
| `baseline_lr.recall_by_class` | 0.9733, 0.9401, 0.6155, 0.6148, 0.4229 |
| `baseline_lr.confusable_pair_error` | 0.3278 |
| `challenger_hgb.macro_f1` | 0.7084 |
| `challenger_hgb.accuracy` | 0.74582 |
| `challenger_hgb.ece` | 0.057601 |
| `challenger_hgb.recall_by_class` | 0.9615, 0.9323, 0.5945, 0.5971, 0.4401 |
| `challenger_hgb.confusable_pair_error` | 0.35162 |
| `random_split_challenger_macro_f1` | 0.74655 |
| `leaky_split_inflation` | 0.03815 |
| `test_class_shares` | 0.2609, 0.232, 0.1962, 0.1604, 0.1504 |
| `train_class_shares` | 0.3277, 0.2552, 0.1906, 0.17, 0.05659 |

</details>
