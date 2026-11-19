# Vocabulary Size & Level Estimation: worked example

> Run on synthetic data with `regression` engine, seed 82532, knobs {"n": 24710, "outlier_share": 0.022, "drift": 0.24}, in 3.6 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Estimate a learner's vocabulary size and unknown words quickly to select appropriate texts and drills.

**Constraints that shape the design.** Few test items; Word frequency bias; L1 transfer

**Label in this use case.** For "Vocabulary Size & Level Estimation": Estimate a learner's vocabulary size and unknown words quickly to select appropriate texts and drills. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Frequency bands only.

## 2. Choose the signals

Your strongest signal is **Word frequency band** (log frequency). Its rule: Corpus. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 10.79 to 1.59, which looks like a breakthrough and is leakage. A random split reports MAE 4.24 against 4.89 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 7.35; the boosted model 4.89, a gain of 33.5%. Its 80% interval covers 68.5% of outcomes. The hardest segment has an error 1.15 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 7.35 |
| MAE, boosted challenger | 4.89 |
| MAE gain over the baseline | 33.5% |
| 80% interval coverage | 68.5% |
| Worst segment versus overall MAE | 1.15x |
| RMSE with a leaky column versus honest | 1.59 vs 10.79 |

## 5. An edge case from the blueprint

**Learners overclaim knowledge.** learners claim to know words they do not, inflating the estimated vocabulary size. Planned response: Pseudo-word penalties. Write the test that replays this case through your pipeline before you tune anything.

## 6. What to expect on your own data

Report error by segment and by time, never one global number, and keep the interval honest. Replace the synthetic table with your extract and keep the chronological split and the leakage test.

## 7. Do this next

1. `cd starter && make setup && make demo` to reproduce the table above.
2. Replace the synthetic generator with an extract of your data and keep the split, the leakage tests and the gates.
3. Run through `docs/02-delivery-plan.md` milestone by milestone; each exit gate is a number you can check.

<details>
<summary>Every number from this run</summary>

| Metric | Value |
|---|---|
| `rows` | 24710 |
| `train_rows` | 17297 |
| `test_rows` | 7413 |
| `baseline_ridge.mae` | 7.3458 |
| `baseline_ridge.rmse` | 12.738 |
| `baseline_ridge.wape` | 0.13898 |
| `baseline_ridge.r2` | 0.42316 |
| `challenger_gbm.mae` | 4.8872 |
| `challenger_gbm.rmse` | 10.788 |
| `challenger_gbm.wape` | 0.092467 |
| `challenger_gbm.r2` | 0.58626 |
| `mae_gain_vs_baseline` | 0.33469 |
| `interval_80_coverage` | 0.68542 |
| `interval_80_mean_width` | 9.0346 |
| `segment_mae.0` | 4.9507 |
| `segment_mae.1` | 4.7171 |
| `segment_mae.2` | 4.7447 |
| `segment_mae.3` | 5.6303 |
| `worst_segment_vs_overall` | 1.152 |
| `leaky_feature_rmse` | 1.5864 |
| `honest_rmse` | 10.788 |
| `random_split_mae` | 4.243 |
| `chronological_mae` | 4.8872 |

</details>
