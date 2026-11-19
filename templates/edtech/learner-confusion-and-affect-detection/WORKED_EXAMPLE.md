# Learner Confusion & Affect Detection: worked example

> Run on synthetic data with `multiclass` engine, seed 67558, knobs {"n": 14210, "label_noise": 0.073, "dup_share": 0.281}, in 1.0 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Infer confusion, frustration and boredom from interaction signals (and optional consented video) to adapt help in real time.

**Constraints that shape the design.** Privacy and consent (especially minors); Interaction-only default; Cross-cultural validity

**Label in this use case.** For "Learner Confusion & Affect Detection": Infer confusion, frustration and boredom from interaction signals (and optional consented video) to adapt help in real time. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels from lab settings.

## 2. Choose the signals

Your strongest signal is **Response latency anomaly** (time vs personal baseline). Its rule: Baseline. In the starter, the closest executable idea is **separating feature (x1)**: the feature that best separates the classes. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Repeat entities on both sides of a random split inflate macro-F1 by 0.015. The rare class grows from 6.2% of training rows to 16.2% of the test period, so the prior drifts.

## 4. Baseline against the stronger design

Macro-F1 is 0.839 for the multinomial baseline and 0.828 for the boosted model; the baseline is ahead: the added complexity did not earn its place on this run. The confusable pair is mistaken 31.2% of the time by the baseline.

| Result | Value |
|---|---|
| Majority-class accuracy | 26.1% |
| Macro-F1, baseline | 0.839 |
| Macro-F1, challenger | 0.828 |
| Calibration error, baseline versus challenger | 0.018 vs 0.036 |
| Score inflation from a leaky random split | 0.015 |

## 5. An edge case from the blueprint

**Slow readers flagged as confused.** unnecessary interruptions. Planned response: Reading-speed normalisation. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 14210 |
| `train_rows` | 9010 |
| `test_rows` | 3553 |
| `majority_class_accuracy` | 0.26062 |
| `baseline_lr.macro_f1` | 0.83914 |
| `baseline_lr.accuracy` | 0.85364 |
| `baseline_lr.ece` | 0.018322 |
| `baseline_lr.recall_by_class` | 0.9914, 0.9868, 0.7269, 0.6256, 0.8527 |
| `baseline_lr.confusable_pair_error` | 0.31197 |
| `challenger_hgb.macro_f1` | 0.8279 |
| `challenger_hgb.accuracy` | 0.84379 |
| `challenger_hgb.ece` | 0.035954 |
| `challenger_hgb.recall_by_class` | 0.9924, 0.9828, 0.7164, 0.592, 0.844 |
| `challenger_hgb.confusable_pair_error` | 0.33436 |
| `random_split_challenger_macro_f1` | 0.84304 |
| `leaky_split_inflation` | 0.015141 |
| `test_class_shares` | 0.2606, 0.2125, 0.1886, 0.1759, 0.1624 |
| `train_class_shares` | 0.3296, 0.2644, 0.1835, 0.1607, 0.06182 |

</details>
