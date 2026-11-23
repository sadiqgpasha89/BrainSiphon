# Cloud Misconfiguration Detection: worked example

> Run on synthetic data with `multiclass` engine, seed 24538, knobs {"n": 10490, "label_noise": 0.078, "dup_share": 0.39}, in 3.1 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Find risky cloud settings such as public storage, open ports and weak identity rules and rank them by exposure and data sensitivity, opening fixes through infrastructure code.

**Constraints that shape the design.** Exposed critical findings alerted within 1 hour; Fixes proposed as code changes; Owners approve

**Label in this use case.** For "Cloud Misconfiguration Detection": Find risky cloud settings such as public storage, open ports and weak identity rules and rank them by exposure and data sensitivity, opening fixes through infrastructure code. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Severity-only ranking.

## 2. Choose the signals

Your strongest signal is **Internet exposure** (whether the resource is reachable). Its rule: From network analysis. In the starter, the closest executable idea is **separating feature (x1)**: the feature that best separates the classes. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Repeat entities on both sides of a random split inflate macro-F1 by 0.024. The rare class grows from 5.3% of training rows to 13.5% of the test period, so the prior drifts.

## 4. Baseline against the stronger design

Macro-F1 is 0.857 for the multinomial baseline and 0.832 for the boosted model; the baseline is ahead: the added complexity did not earn its place on this run. The confusable pair is mistaken 29.8% of the time by the baseline.

| Result | Value |
|---|---|
| Majority-class accuracy | 25.6% |
| Macro-F1, baseline | 0.857 |
| Macro-F1, challenger | 0.832 |
| Calibration error, baseline versus challenger | 0.028 vs 0.028 |
| Score inflation from a leaky random split | 0.024 |

## 5. An edge case from the blueprint

**Intentional exposure.** a public site is meant to be public. Planned response: Exception register with expiry. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 10490 |
| `train_rows` | 5732 |
| `test_rows` | 2623 |
| `majority_class_accuracy` | 0.2562 |
| `baseline_lr.macro_f1` | 0.85667 |
| `baseline_lr.accuracy` | 0.86199 |
| `baseline_lr.ece` | 0.028057 |
| `baseline_lr.recall_by_class` | 0.9762, 0.9663, 0.7172, 0.633, 0.9887 |
| `baseline_lr.confusable_pair_error` | 0.29811 |
| `challenger_hgb.macro_f1` | 0.83211 |
| `challenger_hgb.accuracy` | 0.83721 |
| `challenger_hgb.ece` | 0.027534 |
| `challenger_hgb.recall_by_class` | 0.9673, 0.963, 0.6405, 0.6066, 0.9802 |
| `challenger_hgb.confusable_pair_error` | 0.35394 |
| `random_split_challenger_macro_f1` | 0.85566 |
| `leaky_split_inflation` | 0.023555 |
| `test_class_shares` | 0.2562, 0.2265, 0.2089, 0.1735, 0.135 |
| `train_class_shares` | 0.3442, 0.2448, 0.1891, 0.1687, 0.05321 |

</details>
