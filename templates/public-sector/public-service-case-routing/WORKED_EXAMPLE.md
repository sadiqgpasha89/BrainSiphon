# Public Service Case Routing and Priority: worked example

> Run on synthetic data with `multiclass` engine, seed 4718, knobs {"n": 15690, "label_noise": 0.061, "dup_share": 0.261}, in 2.2 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Route incoming cases to the right team and flag those at risk of missing a legal deadline, so staff time goes to the urgent and complex.

**Constraints that shape the design.** Routing and deadline flags only; Statutory deadlines tracked in rules not in a model; Staff can reassign

**Label in this use case.** For "Public Service Case Routing and Priority": Route incoming cases to the right team and flag those at risk of missing a legal deadline, so staff time goes to the urgent and complex. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Model-set legal deadlines.

## 2. Choose the signals

Your strongest signal is **Case type and complexity indicators** (type, parties and documents). Its rule: From intake. In the starter, the closest executable idea is **separating feature (x1)**: the feature that best separates the classes. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Repeat entities on both sides of a random split inflate macro-F1 by 0.034. The rare class grows from 6.1% of training rows to 16.9% of the test period, so the prior drifts.

## 4. Baseline against the stronger design

Macro-F1 is 0.791 for the multinomial baseline and 0.781 for the boosted model; the baseline is ahead: the added complexity did not earn its place on this run. The confusable pair is mistaken 28.5% of the time by the baseline.

| Result | Value |
|---|---|
| Majority-class accuracy | 23.8% |
| Macro-F1, baseline | 0.791 |
| Macro-F1, challenger | 0.781 |
| Calibration error, baseline versus challenger | 0.026 vs 0.032 |
| Score inflation from a leaky random split | 0.034 |

## 5. An edge case from the blueprint

**New rule.** a law changes the deadline. Planned response: Versioned rules. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 15690 |
| `train_rows` | 10158 |
| `test_rows` | 3923 |
| `majority_class_accuracy` | 0.23783 |
| `baseline_lr.macro_f1` | 0.79106 |
| `baseline_lr.accuracy` | 0.80576 |
| `baseline_lr.ece` | 0.025533 |
| `baseline_lr.recall_by_class` | 0.9818, 0.9682, 0.7481, 0.676, 0.5813 |
| `baseline_lr.confusable_pair_error` | 0.28525 |
| `challenger_hgb.macro_f1` | 0.78052 |
| `challenger_hgb.accuracy` | 0.79607 |
| `challenger_hgb.ece` | 0.032309 |
| `challenger_hgb.recall_by_class` | 0.9796, 0.967, 0.743, 0.6441, 0.5708 |
| `challenger_hgb.confusable_pair_error` | 0.30214 |
| `random_split_challenger_macro_f1` | 0.8144 |
| `leaky_split_inflation` | 0.033883 |
| `test_class_shares` | 0.2378, 0.2006, 0.2004, 0.1919, 0.1693 |
| `train_class_shares` | 0.3292, 0.2563, 0.1879, 0.1659, 0.06074 |

</details>
