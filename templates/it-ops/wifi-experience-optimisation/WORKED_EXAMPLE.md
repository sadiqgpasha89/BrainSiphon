# Wi-Fi Experience Optimisation: worked example

> Run on synthetic data with `multiclass` engine, seed 39562, knobs {"n": 12640, "label_noise": 0.043, "dup_share": 0.374}, in 2.3 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Tune channel, power and access point placement recommendations from client experience data so wireless issues fall, using access point and client-class aggregates and not named users.

**Constraints that shape the design.** Client data aggregated by access point and device class; Changes applied in staged groups; Rollback on experience regression

**Label in this use case.** For "Wi-Fi Experience Optimisation": Tune channel, power and access point placement recommendations from client experience data so wireless issues fall, using access point and client-class aggregates and not named users. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Signal strength as the target.

## 2. Choose the signals

Your strongest signal is **Client connection failures** (failed associations and roams). Its rule: From controllers. In the starter, the closest executable idea is **separating feature (x1)**: the feature that best separates the classes. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Repeat entities on both sides of a random split inflate macro-F1 by 0.022. The rare class grows from 5.5% of training rows to 14.0% of the test period, so the prior drifts.

## 4. Baseline against the stronger design

Macro-F1 is 0.805 for the multinomial baseline and 0.789 for the boosted model; the baseline is ahead: the added complexity did not earn its place on this run. The confusable pair is mistaken 19.7% of the time by the baseline.

| Result | Value |
|---|---|
| Majority-class accuracy | 26.6% |
| Macro-F1, baseline | 0.805 |
| Macro-F1, challenger | 0.789 |
| Calibration error, baseline versus challenger | 0.021 vs 0.050 |
| Score inflation from a leaky random split | 0.022 |

## 5. An edge case from the blueprint

**Event days.** density spikes in one area. Planned response: Event schedules. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 12640 |
| `train_rows` | 7191 |
| `test_rows` | 3160 |
| `majority_class_accuracy` | 0.26582 |
| `baseline_lr.macro_f1` | 0.80475 |
| `baseline_lr.accuracy` | 0.81329 |
| `baseline_lr.ece` | 0.020749 |
| `baseline_lr.recall_by_class` | 0.8845, 0.9704, 0.5794, 0.6317, 0.9569 |
| `baseline_lr.confusable_pair_error` | 0.19736 |
| `challenger_hgb.macro_f1` | 0.78868 |
| `challenger_hgb.accuracy` | 0.79715 |
| `challenger_hgb.ece` | 0.050436 |
| `challenger_hgb.recall_by_class` | 0.8631, 0.9597, 0.5855, 0.5844, 0.9433 |
| `challenger_hgb.confusable_pair_error` | 0.20176 |
| `random_split_challenger_macro_f1` | 0.81111 |
| `leaky_split_inflation` | 0.022434 |
| `test_class_shares` | 0.2658, 0.2354, 0.2054, 0.1538, 0.1396 |
| `train_class_shares` | 0.3246, 0.2605, 0.1893, 0.1705, 0.05521 |

</details>
