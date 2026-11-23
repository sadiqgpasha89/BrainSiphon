# CMDB Reconciliation and Dependency Mapping: worked example

> Run on synthetic data with `multiclass` engine, seed 38257, knobs {"n": 11810, "label_noise": 0.069, "dup_share": 0.43}, in 2.9 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Keep the configuration database accurate by matching discovered assets, cloud resources and traffic flows to records, proposing merges, owners and dependencies for data stewards to approve.

**Constraints that shape the design.** Stewards approve merges and deletions; Match confidence shown; Dependencies derived from observed traffic

**Label in this use case.** For "CMDB Reconciliation and Dependency Mapping": Keep the configuration database accurate by matching discovered assets, cloud resources and traffic flows to records, proposing merges, owners and dependencies for data stewards to approve. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Automatic overwrite.

## 2. Choose the signals

Your strongest signal is **Identifier match** (serial, hostname and address match). Its rule: From discovery. In the starter, the closest executable idea is **separating feature (x1)**: the feature that best separates the classes. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Repeat entities on both sides of a random split inflate macro-F1 by 0.025. The rare class grows from 5.6% of training rows to 13.3% of the test period, so the prior drifts.

## 4. Baseline against the stronger design

Macro-F1 is 0.851 for the multinomial baseline and 0.845 for the boosted model; the baseline is ahead: the added complexity did not earn its place on this run. The confusable pair is mistaken 31.7% of the time by the baseline.

| Result | Value |
|---|---|
| Majority-class accuracy | 25.8% |
| Macro-F1, baseline | 0.851 |
| Macro-F1, challenger | 0.845 |
| Calibration error, baseline versus challenger | 0.009 vs 0.035 |
| Score inflation from a leaky random split | 0.025 |

## 5. An edge case from the blueprint

**Duplicate hostnames.** two systems share a name. Planned response: Use multiple identifiers. Write the test that replays this case through your pipeline before you tune anything.

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
| `train_rows` | 6096 |
| `test_rows` | 2953 |
| `majority_class_accuracy` | 0.25804 |
| `baseline_lr.macro_f1` | 0.85051 |
| `baseline_lr.accuracy` | 0.86184 |
| `baseline_lr.ece` | 0.0087197 |
| `baseline_lr.recall_by_class` | 0.9711, 0.9819, 0.7282, 0.6306, 0.926 |
| `baseline_lr.confusable_pair_error` | 0.31667 |
| `challenger_hgb.macro_f1` | 0.8454 |
| `challenger_hgb.accuracy` | 0.85676 |
| `challenger_hgb.ece` | 0.035304 |
| `challenger_hgb.recall_by_class` | 0.9711, 0.9791, 0.6892, 0.6422, 0.9337 |
| `challenger_hgb.confusable_pair_error` | 0.32963 |
| `random_split_challenger_macro_f1` | 0.8708 |
| `leaky_split_inflation` | 0.025402 |
| `test_class_shares` | 0.258, 0.2435, 0.1907, 0.1751, 0.1327 |
| `train_class_shares` | 0.3404, 0.2552, 0.1864, 0.1621, 0.05594 |

</details>
