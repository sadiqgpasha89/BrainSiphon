# OR Scheduling & Surgical Case Duration Prediction: worked example

> Run on synthetic data with `regression` engine, seed 54059, knobs {"n": 25450, "outlier_share": 0.031, "drift": 0.4}, in 4.1 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict surgical case durations and sequence operating-room blocks to cut overtime and idle time.

**Constraints that shape the design.** Surgeon preferences; Equipment availability; Emergency add-ons

**Label in this use case.** For "OR Scheduling & Surgical Case Duration Prediction": Predict surgical case durations and sequence operating-room blocks to cut overtime and idle time. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using actual durations booked after the fact.

## 2. Choose the signals

Your strongest signal is **Surgeon-procedure history** (surgeon's median duration for procedure). Its rule: Window before case date. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 12.00 to 1.46, which looks like a breakthrough and is leakage. A random split reports MAE 4.83 against 5.85 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 7.93; the boosted model 5.85, a gain of 26.2%. Its 80% interval covers 60.3% of outcomes. The hardest segment has an error 1.21 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 7.93 |
| MAE, boosted challenger | 5.85 |
| MAE gain over the baseline | 26.2% |
| 80% interval coverage | 60.3% |
| Worst segment versus overall MAE | 1.21x |
| RMSE with a leaky column versus honest | 1.46 vs 12.00 |

## 5. An edge case from the blueprint

**New surgical technique.** durations unknown. Planned response: Procedure-family priors and early-update posterior. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 25450 |
| `train_rows` | 17815 |
| `test_rows` | 7635 |
| `baseline_ridge.mae` | 7.9266 |
| `baseline_ridge.rmse` | 13.718 |
| `baseline_ridge.wape` | 0.1495 |
| `baseline_ridge.r2` | 0.42138 |
| `challenger_gbm.mae` | 5.852 |
| `challenger_gbm.rmse` | 12.002 |
| `challenger_gbm.wape` | 0.11037 |
| `challenger_gbm.r2` | 0.55713 |
| `mae_gain_vs_baseline` | 0.26173 |
| `interval_80_coverage` | 0.60262 |
| `interval_80_mean_width` | 9.2866 |
| `segment_mae.0` | 5.7777 |
| `segment_mae.1` | 5.795 |
| `segment_mae.2` | 5.8325 |
| `segment_mae.3` | 7.0704 |
| `worst_segment_vs_overall` | 1.2082 |
| `leaky_feature_rmse` | 1.4648 |
| `honest_rmse` | 12.002 |
| `random_split_mae` | 4.8322 |
| `chronological_mae` | 5.852 |

</details>
