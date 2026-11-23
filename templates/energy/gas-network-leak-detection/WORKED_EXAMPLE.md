# Gas Network Leak Detection: worked example

> Run on synthetic data with `multiclass` engine, seed 2661, knobs {"n": 14800, "label_noise": 0.066, "dup_share": 0.342}, in 3.2 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect gas leaks along pipelines and in the distribution network from sensors, mobile survey data and pressure behaviour so repair crews are sent to the highest-risk leaks first.

**Constraints that shape the design.** Leak reports ranked by risk and proximity to people and buildings; Safety-critical reports escalate to a person immediately; Crew confirms on site

**Label in this use case.** For "Gas Network Leak Detection": Detect gas leaks along pipelines and in the distribution network from sensors, mobile survey data and pressure behaviour so repair crews are sent to the highest-risk leaks first. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Counting leaks equally.

## 2. Choose the signals

Your strongest signal is **Methane concentration enhancement** (readings above background). Its rule: From survey sensors. In the starter, the closest executable idea is **separating feature (x1)**: the feature that best separates the classes. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Repeat entities on both sides of a random split inflate macro-F1 by 0.037. The rare class grows from 5.8% of training rows to 15.0% of the test period, so the prior drifts.

## 4. Baseline against the stronger design

Macro-F1 is 0.775 for the multinomial baseline and 0.766 for the boosted model; the baseline is ahead: the added complexity did not earn its place on this run. The confusable pair is mistaken 25.3% of the time by the baseline.

| Result | Value |
|---|---|
| Majority-class accuracy | 24.7% |
| Macro-F1, baseline | 0.775 |
| Macro-F1, challenger | 0.766 |
| Calibration error, baseline versus challenger | 0.023 vs 0.047 |
| Score inflation from a leaky random split | 0.037 |

## 5. An edge case from the blueprint

**Sewer gas.** methane is not from the network. Planned response: Isotope or odour flags where available. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 14800 |
| `train_rows` | 8772 |
| `test_rows` | 3700 |
| `majority_class_accuracy` | 0.2473 |
| `baseline_lr.macro_f1` | 0.77545 |
| `baseline_lr.accuracy` | 0.78432 |
| `baseline_lr.ece` | 0.023248 |
| `baseline_lr.recall_by_class` | 0.9311, 0.9078, 0.6937, 0.4578, 0.8937 |
| `baseline_lr.confusable_pair_error` | 0.25298 |
| `challenger_hgb.macro_f1` | 0.76594 |
| `challenger_hgb.accuracy` | 0.77541 |
| `challenger_hgb.ece` | 0.047052 |
| `challenger_hgb.recall_by_class` | 0.9279, 0.9041, 0.6896, 0.4392, 0.8739 |
| `challenger_hgb.confusable_pair_error` | 0.2719 |
| `random_split_challenger_macro_f1` | 0.80324 |
| `leaky_split_inflation` | 0.037299 |
| `test_class_shares` | 0.2473, 0.217, 0.1968, 0.1889, 0.15 |
| `train_class_shares` | 0.3277, 0.2647, 0.1906, 0.1589, 0.05803 |

</details>
