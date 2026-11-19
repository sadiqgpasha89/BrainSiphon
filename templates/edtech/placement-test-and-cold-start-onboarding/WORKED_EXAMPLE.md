# Placement Test & Cold-Start Onboarding: worked example

> Run on synthetic data with `multiclass` engine, seed 88295, knobs {"n": 11880, "label_noise": 0.051, "dup_share": 0.43}, in 2.0 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Estimate a new learner's level in a few questions to place them in the right starting content and initialise the learner model.

**Constraints that shape the design.** Under 10 questions; Frustration risk; Multiple skills

**Label in this use case.** For "Placement Test & Cold-Start Onboarding": Estimate a new learner's level in a few questions to place them in the right starting content and initialise the learner model. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating on motivated volunteers.

## 2. Choose the signals

Your strongest signal is **Expected information gain per item** (EIG of next question). Its rule: IRT. In the starter, the closest executable idea is **separating feature (x1)**: the feature that best separates the classes. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Repeat entities on both sides of a random split inflate macro-F1 by 0.026. The rare class grows from 6.1% of training rows to 13.1% of the test period, so the prior drifts.

## 4. Baseline against the stronger design

Macro-F1 is 0.869 for the multinomial baseline and 0.857 for the boosted model; the baseline is ahead: the added complexity did not earn its place on this run. The confusable pair is mistaken 24.6% of the time by the baseline.

| Result | Value |
|---|---|
| Majority-class accuracy | 27.6% |
| Macro-F1, baseline | 0.869 |
| Macro-F1, challenger | 0.857 |
| Calibration error, baseline versus challenger | 0.019 vs 0.038 |
| Score inflation from a leaky random split | 0.026 |

## 5. An edge case from the blueprint

**Learners guess randomly.** ability overestimated. Planned response: Guessing models and response-time filters. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 11880 |
| `train_rows` | 6129 |
| `test_rows` | 2970 |
| `majority_class_accuracy` | 0.27609 |
| `baseline_lr.macro_f1` | 0.86899 |
| `baseline_lr.accuracy` | 0.8798 |
| `baseline_lr.ece` | 0.019499 |
| `baseline_lr.recall_by_class` | 0.9902, 0.9689, 0.7148, 0.7435, 0.9154 |
| `baseline_lr.confusable_pair_error` | 0.24608 |
| `challenger_hgb.macro_f1` | 0.85684 |
| `challenger_hgb.accuracy` | 0.86835 |
| `challenger_hgb.ece` | 0.03778 |
| `challenger_hgb.recall_by_class` | 0.9854, 0.963, 0.7096, 0.7097, 0.9 |
| `challenger_hgb.confusable_pair_error` | 0.26267 |
| `random_split_challenger_macro_f1` | 0.88246 |
| `leaky_split_inflation` | 0.025618 |
| `test_class_shares` | 0.2761, 0.2273, 0.196, 0.1694, 0.1313 |
| `train_class_shares` | 0.3397, 0.2521, 0.177, 0.17, 0.06118 |

</details>
