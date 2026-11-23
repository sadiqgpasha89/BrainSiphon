# Meter-to-Cash Exception Triage: worked example

> Run on synthetic data with `multiclass` engine, seed 10274, knobs {"n": 13360, "label_noise": 0.071, "dup_share": 0.302}, in 2.8 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Classify and route billing exceptions such as unusual reads, rejected bills and mismatched accounts so analysts fix the most costly ones first.

**Constraints that shape the design.** Exception type and fix route for every item; Value at risk shown; Analysts approve every correction

**Label in this use case.** For "Meter-to-Cash Exception Triage": Classify and route billing exceptions such as unusual reads, rejected bills and mismatched accounts so analysts fix the most costly ones first. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Code-only labels.

## 2. Choose the signals

Your strongest signal is **Exception code and text** (code and free-text note). Its rule: From the billing system. In the starter, the closest executable idea is **separating feature (x1)**: the feature that best separates the classes. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Repeat entities on both sides of a random split inflate macro-F1 by 0.008. The rare class grows from 5.9% of training rows to 15.6% of the test period, so the prior drifts.

## 4. Baseline against the stronger design

Macro-F1 is 0.728 for the multinomial baseline and 0.716 for the boosted model; the baseline is ahead: the added complexity did not earn its place on this run. The confusable pair is mistaken 28.4% of the time by the baseline.

| Result | Value |
|---|---|
| Majority-class accuracy | 25.7% |
| Macro-F1, baseline | 0.728 |
| Macro-F1, challenger | 0.716 |
| Calibration error, baseline versus challenger | 0.014 vs 0.050 |
| Score inflation from a leaky random split | 0.008 |

## 5. An edge case from the blueprint

**New exception type.** the classifier has not seen it. Planned response: Abstain and route to an expert. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 13360 |
| `train_rows` | 8220 |
| `test_rows` | 3340 |
| `majority_class_accuracy` | 0.25689 |
| `baseline_lr.macro_f1` | 0.72785 |
| `baseline_lr.accuracy` | 0.75659 |
| `baseline_lr.ece` | 0.013994 |
| `baseline_lr.recall_by_class` | 0.9802, 0.9574, 0.6207, 0.6306, 0.4338 |
| `baseline_lr.confusable_pair_error` | 0.28401 |
| `challenger_hgb.macro_f1` | 0.71583 |
| `challenger_hgb.accuracy` | 0.74281 |
| `challenger_hgb.ece` | 0.049702 |
| `challenger_hgb.recall_by_class` | 0.9744, 0.9474, 0.5911, 0.5687, 0.476 |
| `challenger_hgb.confusable_pair_error` | 0.31026 |
| `random_split_challenger_macro_f1` | 0.72377 |
| `leaky_split_inflation` | 0.0079363 |
| `test_class_shares` | 0.2569, 0.2108, 0.2021, 0.1743, 0.156 |
| `train_class_shares` | 0.3367, 0.2524, 0.1841, 0.1674, 0.05937 |

</details>
