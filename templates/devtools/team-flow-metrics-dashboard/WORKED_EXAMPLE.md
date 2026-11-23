# Team Flow Metrics and Insights: worked example

> Run on synthetic data with `multiclass` engine, seed 15720, knobs {"n": 14960, "label_noise": 0.062, "dup_share": 0.412}, in 2.8 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Show team-level flow metrics such as lead time, deployment frequency and change failure rate with explanations of what moved, to support team improvement and never to rank people.

**Constraints that shape the design.** Metrics at team level with a minimum group size; No individual views; Teams own their data

**Label in this use case.** For "Team Flow Metrics and Insights": Show team-level flow metrics such as lead time, deployment frequency and change failure rate with explanations of what moved, to support team improvement and never to rank people. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Individual metrics.

## 2. Choose the signals

Your strongest signal is **Lead time for changes** (time from commit to production). Its rule: From CI and CD. In the starter, the closest executable idea is **separating feature (x1)**: the feature that best separates the classes. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Repeat entities on both sides of a random split inflate macro-F1 by 0.048. The rare class grows from 6.0% of training rows to 14.0% of the test period, so the prior drifts.

## 4. Baseline against the stronger design

Macro-F1 is 0.756 for the multinomial baseline and 0.733 for the boosted model; the baseline is ahead: the added complexity did not earn its place on this run. The confusable pair is mistaken 21.9% of the time by the baseline.

| Result | Value |
|---|---|
| Majority-class accuracy | 27.3% |
| Macro-F1, baseline | 0.756 |
| Macro-F1, challenger | 0.733 |
| Calibration error, baseline versus challenger | 0.015 vs 0.044 |
| Score inflation from a leaky random split | 0.048 |

## 5. An edge case from the blueprint

**Small team.** the group is under the minimum. Planned response: Suppress or merge groups. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 14960 |
| `train_rows` | 7936 |
| `test_rows` | 3740 |
| `majority_class_accuracy` | 0.27299 |
| `baseline_lr.macro_f1` | 0.75621 |
| `baseline_lr.accuracy` | 0.77647 |
| `baseline_lr.ece` | 0.01463 |
| `baseline_lr.recall_by_class` | 0.9559, 0.8335, 0.6634, 0.391, 0.9406 |
| `baseline_lr.confusable_pair_error` | 0.21946 |
| `challenger_hgb.macro_f1` | 0.73277 |
| `challenger_hgb.accuracy` | 0.75214 |
| `challenger_hgb.ece` | 0.043992 |
| `challenger_hgb.recall_by_class` | 0.9412, 0.806, 0.6167, 0.378, 0.9195 |
| `challenger_hgb.confusable_pair_error` | 0.24133 |
| `random_split_challenger_macro_f1` | 0.78101 |
| `leaky_split_inflation` | 0.048234 |
| `test_class_shares` | 0.273, 0.2329, 0.189, 0.1655, 0.1396 |
| `train_class_shares` | 0.3306, 0.2613, 0.1825, 0.1651, 0.06048 |

</details>
