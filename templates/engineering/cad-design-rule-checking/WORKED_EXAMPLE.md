# CAD Design Rule Checking: worked example

> Run on synthetic data with `multiclass` engine, seed 78858, knobs {"n": 13930, "label_noise": 0.059, "dup_share": 0.269}, in 3.0 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Check CAD models against company rules and manufacturability limits, such as minimum wall thickness and hole spacing, and explain violations in the design tool.

**Constraints that shape the design.** Rule checks run in the design tool within 30 s; Violations show the rule and the geometry; Rule owners manage the rule library

**Label in this use case.** For "CAD Design Rule Checking": Check CAD models against company rules and manufacturability limits, such as minimum wall thickness and hole spacing, and explain violations in the design tool. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Learned rules without authority.

## 2. Choose the signals

Your strongest signal is **Feature geometry** (walls, holes and radii). Its rule: From the CAD model. In the starter, the closest executable idea is **separating feature (x1)**: the feature that best separates the classes. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Repeat entities on both sides of a random split inflate macro-F1 by 0.016. The rare class grows from 5.7% of training rows to 17.0% of the test period, so the prior drifts.

## 4. Baseline against the stronger design

Macro-F1 is 0.809 for the multinomial baseline and 0.802 for the boosted model; the baseline is ahead: the added complexity did not earn its place on this run. The confusable pair is mistaken 28.8% of the time by the baseline.

| Result | Value |
|---|---|
| Majority-class accuracy | 24.5% |
| Macro-F1, baseline | 0.809 |
| Macro-F1, challenger | 0.802 |
| Calibration error, baseline versus challenger | 0.014 vs 0.030 |
| Score inflation from a leaky random split | 0.016 |

## 5. An edge case from the blueprint

**Complex freeform surface.** features are hard to extract. Planned response: Manual review flag. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 13930 |
| `train_rows` | 8909 |
| `test_rows` | 3483 |
| `majority_class_accuracy` | 0.24548 |
| `baseline_lr.macro_f1` | 0.80879 |
| `baseline_lr.accuracy` | 0.81051 |
| `baseline_lr.ece` | 0.014225 |
| `baseline_lr.recall_by_class` | 0.8784, 0.8157, 0.7132, 0.6879, 0.9409 |
| `baseline_lr.confusable_pair_error` | 0.28796 |
| `challenger_hgb.macro_f1` | 0.80168 |
| `challenger_hgb.accuracy` | 0.8039 |
| `challenger_hgb.ece` | 0.030328 |
| `challenger_hgb.recall_by_class` | 0.8749, 0.8118, 0.6995, 0.6699, 0.9459 |
| `challenger_hgb.confusable_pair_error` | 0.30134 |
| `random_split_challenger_macro_f1` | 0.81783 |
| `leaky_split_inflation` | 0.016153 |
| `test_class_shares` | 0.2455, 0.2196, 0.1892, 0.1757, 0.17 |
| `train_class_shares` | 0.3312, 0.2604, 0.1895, 0.162, 0.05691 |

</details>
