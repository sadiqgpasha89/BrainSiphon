# Patch Prioritisation and Rollout Planning: worked example

> Run on synthetic data with `multiclass` engine, seed 22790, knobs {"n": 15530, "label_noise": 0.043, "dup_share": 0.428}, in 3.5 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Prioritise patches by exploit risk, exposure and business criticality and plan staged rollouts with test rings, for change approvers to confirm.

**Constraints that shape the design.** Actively exploited vulnerabilities patched within 7 days; Staged rings with health gates; Approvers confirm each wave

**Label in this use case.** For "Patch Prioritisation and Rollout Planning": Prioritise patches by exploit risk, exposure and business criticality and plan staged rollouts with test rings, for change approvers to confirm. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: CVSS-only priority.

## 2. Choose the signals

Your strongest signal is **Exploit status** (known exploitation). Its rule: From threat feeds. In the starter, the closest executable idea is **separating feature (x1)**: the feature that best separates the classes. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Repeat entities on both sides of a random split inflate macro-F1 by 0.035. The rare class grows from 6.1% of training rows to 13.9% of the test period, so the prior drifts.

## 4. Baseline against the stronger design

Macro-F1 is 0.861 for the multinomial baseline and 0.845 for the boosted model; the baseline is ahead: the added complexity did not earn its place on this run. The confusable pair is mistaken 24.9% of the time by the baseline.

| Result | Value |
|---|---|
| Majority-class accuracy | 27.5% |
| Macro-F1, baseline | 0.861 |
| Macro-F1, challenger | 0.845 |
| Calibration error, baseline versus challenger | 0.019 vs 0.036 |
| Score inflation from a leaky random split | 0.035 |

## 5. An edge case from the blueprint

**Unpatchable system.** a legacy system cannot take the patch. Planned response: Compensating controls. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 15530 |
| `train_rows` | 8054 |
| `test_rows` | 3883 |
| `majority_class_accuracy` | 0.27479 |
| `baseline_lr.macro_f1` | 0.86063 |
| `baseline_lr.accuracy` | 0.8684 |
| `baseline_lr.ece` | 0.019199 |
| `baseline_lr.recall_by_class` | 0.9494, 0.9792, 0.7658, 0.625, 0.9759 |
| `baseline_lr.confusable_pair_error` | 0.24894 |
| `challenger_hgb.macro_f1` | 0.84455 |
| `challenger_hgb.accuracy` | 0.85346 |
| `challenger_hgb.ece` | 0.035825 |
| `challenger_hgb.recall_by_class` | 0.9428, 0.9758, 0.7438, 0.5868, 0.9648 |
| `challenger_hgb.confusable_pair_error` | 0.27943 |
| `random_split_challenger_macro_f1` | 0.87958 |
| `leaky_split_inflation` | 0.035028 |
| `test_class_shares` | 0.2748, 0.223, 0.188, 0.1751, 0.1391 |
| `train_class_shares` | 0.3319, 0.2475, 0.2051, 0.1547, 0.06084 |

</details>
