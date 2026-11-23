# Software Licence Optimisation: worked example

> Run on synthetic data with `multiclass` engine, seed 37163, knobs {"n": 11180, "label_noise": 0.053, "dup_share": 0.374}, in 2.8 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Match software licences to actual use, reclaim unused seats and forecast renewals so the company pays for what it needs while staying compliant with vendor terms.

**Constraints that shape the design.** Reclaim only after notice to the user; Compliance position checked before changes; Licence managers approve

**Label in this use case.** For "Software Licence Optimisation": Match software licences to actual use, reclaim unused seats and forecast renewals so the company pays for what it needs while staying compliant with vendor terms. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Install count as use.

## 2. Choose the signals

Your strongest signal is **Last use and frequency** (recent usage). Its rule: From usage tools. In the starter, the closest executable idea is **separating feature (x1)**: the feature that best separates the classes. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Repeat entities on both sides of a random split inflate macro-F1 by 0.016. The rare class grows from 5.7% of training rows to 14.3% of the test period, so the prior drifts.

## 4. Baseline against the stronger design

Macro-F1 is 0.877 for the multinomial baseline and 0.860 for the boosted model; the baseline is ahead: the added complexity did not earn its place on this run. The confusable pair is mistaken 24.4% of the time by the baseline.

| Result | Value |
|---|---|
| Majority-class accuracy | 26.4% |
| Macro-F1, baseline | 0.877 |
| Macro-F1, challenger | 0.860 |
| Calibration error, baseline versus challenger | 0.027 vs 0.025 |
| Score inflation from a leaky random split | 0.016 |

## 5. An edge case from the blueprint

**Seasonal products.** use happens once per quarter. Planned response: Longer windows. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 11180 |
| `train_rows` | 6264 |
| `test_rows` | 2795 |
| `majority_class_accuracy` | 0.26404 |
| `baseline_lr.macro_f1` | 0.87721 |
| `baseline_lr.accuracy` | 0.88658 |
| `baseline_lr.ece` | 0.027044 |
| `baseline_lr.recall_by_class` | 0.9824, 0.9951, 0.7405, 0.7043, 0.9651 |
| `baseline_lr.confusable_pair_error` | 0.24376 |
| `challenger_hgb.macro_f1` | 0.86009 |
| `challenger_hgb.accuracy` | 0.86977 |
| `challenger_hgb.ece` | 0.024928 |
| `challenger_hgb.recall_by_class` | 0.9797, 0.9919, 0.7113, 0.663, 0.9476 |
| `challenger_hgb.confusable_pair_error` | 0.28215 |
| `random_split_challenger_macro_f1` | 0.87574 |
| `leaky_split_inflation` | 0.015647 |
| `test_class_shares` | 0.264, 0.2197, 0.2082, 0.1646, 0.1435 |
| `train_class_shares` | 0.3356, 0.2506, 0.1924, 0.1648, 0.05667 |

</details>
