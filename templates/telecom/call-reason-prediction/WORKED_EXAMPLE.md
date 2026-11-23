# Call Reason Prediction: worked example

> Run on synthetic data with `multiclass` engine, seed 51811, knobs {"n": 15790, "label_noise": 0.075, "dup_share": 0.254}, in 2.7 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict why a customer is contacting care as they enter the queue so the right skill, content or self-service step is offered immediately.

**Constraints that shape the design.** Prediction within 60 ms of the contact starting; Top three reasons shown to the agent; No sensitive inference such as health or religion

**Label in this use case.** For "Call Reason Prediction": Predict why a customer is contacting care as they enter the queue so the right skill, content or self-service step is offered immediately. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on menu choices.

## 2. Choose the signals

Your strongest signal is **Recent bill event** (days since the last bill and a bill change flag). Its rule: As at contact time. In the starter, the closest executable idea is **separating feature (x1)**: the feature that best separates the classes. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Repeat entities on both sides of a random split inflate macro-F1 by 0.003. The rare class grows from 6.0% of training rows to 16.6% of the test period, so the prior drifts.

## 4. Baseline against the stronger design

Macro-F1 is 0.820 for the multinomial baseline and 0.805 for the boosted model; the baseline is ahead: the added complexity did not earn its place on this run. The confusable pair is mistaken 29.7% of the time by the baseline.

| Result | Value |
|---|---|
| Majority-class accuracy | 23.9% |
| Macro-F1, baseline | 0.820 |
| Macro-F1, challenger | 0.805 |
| Calibration error, baseline versus challenger | 0.014 vs 0.019 |
| Score inflation from a leaky random split | 0.003 |

## 5. An edge case from the blueprint

**New product launch.** new reasons appear. Planned response: Allow an other bucket and monitor its growth. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 15790 |
| `train_rows` | 10244 |
| `test_rows` | 3948 |
| `majority_class_accuracy` | 0.2386 |
| `baseline_lr.macro_f1` | 0.82003 |
| `baseline_lr.accuracy` | 0.82903 |
| `baseline_lr.ece` | 0.014293 |
| `baseline_lr.recall_by_class` | 0.9522, 0.9765, 0.6866, 0.5407, 0.9437 |
| `baseline_lr.confusable_pair_error` | 0.29659 |
| `challenger_hgb.macro_f1` | 0.80549 |
| `challenger_hgb.accuracy` | 0.8151 |
| `challenger_hgb.ece` | 0.019372 |
| `challenger_hgb.recall_by_class` | 0.949, 0.973, 0.6522, 0.5197, 0.933 |
| `challenger_hgb.confusable_pair_error` | 0.31931 |
| `random_split_challenger_macro_f1` | 0.80875 |
| `leaky_split_inflation` | 0.0032556 |
| `test_class_shares` | 0.2386, 0.2158, 0.1988, 0.1803, 0.1664 |
| `train_class_shares` | 0.3249, 0.2591, 0.197, 0.1588, 0.06023 |

</details>
