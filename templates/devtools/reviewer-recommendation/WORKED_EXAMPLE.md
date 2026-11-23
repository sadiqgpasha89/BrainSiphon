# Reviewer Recommendation: worked example

> Run on synthetic data with `multiclass` engine, seed 2621, knobs {"n": 15110, "label_noise": 0.083, "dup_share": 0.344}, in 3.1 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Suggest reviewers for a pull request by code ownership, expertise and current review load so reviews are fast, knowledge spreads and nobody is overloaded.

**Constraints that shape the design.** Suggestions respect ownership files and conflicts; Review load balanced across the team; Authors can choose anyone

**Label in this use case.** For "Reviewer Recommendation": Suggest reviewers for a pull request by code ownership, expertise and current review load so reviews are fast, knowledge spreads and nobody is overloaded. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Always choosing the top expert.

## 2. Choose the signals

Your strongest signal is **File ownership and expertise** (prior work on the files). Its rule: From version control. In the starter, the closest executable idea is **separating feature (x1)**: the feature that best separates the classes. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Repeat entities on both sides of a random split inflate macro-F1 by 0.033. The rare class grows from 5.8% of training rows to 14.7% of the test period, so the prior drifts.

## 4. Baseline against the stronger design

Macro-F1 is 0.775 for the multinomial baseline and 0.755 for the boosted model; the baseline is ahead: the added complexity did not earn its place on this run. The confusable pair is mistaken 30.5% of the time by the baseline.

| Result | Value |
|---|---|
| Majority-class accuracy | 25.9% |
| Macro-F1, baseline | 0.775 |
| Macro-F1, challenger | 0.755 |
| Calibration error, baseline versus challenger | 0.023 vs 0.053 |
| Score inflation from a leaky random split | 0.033 |

## 5. An edge case from the blueprint

**Single owner.** only one person knows the code. Planned response: Cross-training suggestions. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 15110 |
| `train_rows` | 8885 |
| `test_rows` | 3778 |
| `majority_class_accuracy` | 0.25887 |
| `baseline_lr.macro_f1` | 0.77489 |
| `baseline_lr.accuracy` | 0.79222 |
| `baseline_lr.ece` | 0.023458 |
| `baseline_lr.recall_by_class` | 0.9693, 0.9626, 0.6803, 0.551, 0.6847 |
| `baseline_lr.confusable_pair_error` | 0.30492 |
| `challenger_hgb.macro_f1` | 0.75499 |
| `challenger_hgb.accuracy` | 0.77343 |
| `challenger_hgb.ece` | 0.052791 |
| `challenger_hgb.recall_by_class` | 0.9642, 0.9589, 0.6301, 0.5306, 0.6649 |
| `challenger_hgb.confusable_pair_error` | 0.33333 |
| `random_split_challenger_macro_f1` | 0.78802 |
| `leaky_split_inflation` | 0.03303 |
| `test_class_shares` | 0.2589, 0.2123, 0.2004, 0.1816, 0.1469 |
| `train_class_shares` | 0.3363, 0.2554, 0.1936, 0.1568, 0.05796 |

</details>
