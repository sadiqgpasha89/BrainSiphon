# Commitment Purchase Planning: worked example

> Run on synthetic data with `multiclass` engine, seed 82606, knobs {"n": 11810, "label_noise": 0.054, "dup_share": 0.281}, in 2.8 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Plan reserved capacity and savings plan purchases from stable baseline usage forecasts, comparing terms and risk so finance approves commitments that will be used.

**Constraints that shape the design.** Commitments cover only the stable baseline; Finance approves every purchase; Scenarios for demand drop

**Label in this use case.** For "Commitment Purchase Planning": Plan reserved capacity and savings plan purchases from stable baseline usage forecasts, comparing terms and risk so finance approves commitments that will be used. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Average usage as baseline.

## 2. Choose the signals

Your strongest signal is **Stable usage floor** (lowest sustained usage). Its rule: From billing. In the starter, the closest executable idea is **separating feature (x1)**: the feature that best separates the classes. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Repeat entities on both sides of a random split inflate macro-F1 by 0.017. The rare class grows from 5.8% of training rows to 16.2% of the test period, so the prior drifts.

## 4. Baseline against the stronger design

Macro-F1 is 0.834 for the multinomial baseline and 0.817 for the boosted model; the baseline is ahead: the added complexity did not earn its place on this run. The confusable pair is mistaken 25.5% of the time by the baseline.

| Result | Value |
|---|---|
| Majority-class accuracy | 26.7% |
| Macro-F1, baseline | 0.834 |
| Macro-F1, challenger | 0.817 |
| Calibration error, baseline versus challenger | 0.022 vs 0.036 |
| Score inflation from a leaky random split | 0.017 |

## 5. An edge case from the blueprint

**Platform migration.** workloads move away. Planned response: Migration-aware scenarios. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 11810 |
| `train_rows` | 7437 |
| `test_rows` | 2953 |
| `majority_class_accuracy` | 0.26685 |
| `baseline_lr.macro_f1` | 0.83365 |
| `baseline_lr.accuracy` | 0.85032 |
| `baseline_lr.ece` | 0.021571 |
| `baseline_lr.recall_by_class` | 0.9937, 0.9553, 0.7153, 0.6268, 0.8658 |
| `baseline_lr.confusable_pair_error` | 0.25542 |
| `challenger_hgb.macro_f1` | 0.81686 |
| `challenger_hgb.accuracy` | 0.83508 |
| `challenger_hgb.ece` | 0.035521 |
| `challenger_hgb.recall_by_class` | 0.9898, 0.9506, 0.7101, 0.5897, 0.8281 |
| `challenger_hgb.confusable_pair_error` | 0.27898 |
| `random_split_challenger_macro_f1` | 0.83345 |
| `leaky_split_inflation` | 0.016586 |
| `test_class_shares` | 0.2668, 0.2123, 0.1951, 0.1642, 0.1615 |
| `train_class_shares` | 0.3372, 0.2497, 0.1931, 0.1616, 0.05836 |

</details>
