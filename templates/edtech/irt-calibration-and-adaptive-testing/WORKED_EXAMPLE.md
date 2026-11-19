# IRT Item Calibration & Computerised Adaptive Testing: worked example

> Run on synthetic data with `regression` engine, seed 5609, knobs {"n": 22430, "outlier_share": 0.025, "drift": 0.344}, in 2.0 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Calibrate item parameters from response data and run adaptive tests that estimate ability precisely with fewer questions.

**Constraints that shape the design.** Test security and item exposure control; Fairness (DIF); Real-time item selection

**Label in this use case.** For "IRT Item Calibration & Computerised Adaptive Testing": Calibrate item parameters from response data and run adaptive tests that estimate ability precisely with fewer questions. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Calibrating on self-selected samples.

## 2. Choose the signals

Your strongest signal is **Item information at current ability** (Fisher information of item). Its rule: Ability estimate precision. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 10.63 to 1.51, which looks like a breakthrough and is leakage. A random split reports MAE 4.59 against 5.15 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 7.33; the boosted model 5.15, a gain of 29.8%. Its 80% interval covers 64.5% of outcomes. The hardest segment has an error 1.14 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 7.33 |
| MAE, boosted challenger | 5.15 |
| MAE gain over the baseline | 29.8% |
| 80% interval coverage | 64.5% |
| Worst segment versus overall MAE | 1.14x |
| RMSE with a leaky column versus honest | 1.51 vs 10.63 |

## 5. An edge case from the blueprint

**Items leaked online.** item parameters drift and scores inflate. Planned response: Exposure monitoring and rapid item retirement. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 22430 |
| `train_rows` | 15700 |
| `test_rows` | 6730 |
| `baseline_ridge.mae` | 7.3317 |
| `baseline_ridge.rmse` | 12.478 |
| `baseline_ridge.wape` | 0.13836 |
| `baseline_ridge.r2` | 0.46189 |
| `challenger_gbm.mae` | 5.1457 |
| `challenger_gbm.rmse` | 10.625 |
| `challenger_gbm.wape` | 0.097108 |
| `challenger_gbm.r2` | 0.60984 |
| `mae_gain_vs_baseline` | 0.29816 |
| `interval_80_coverage` | 0.64547 |
| `interval_80_mean_width` | 9.1559 |
| `segment_mae.0` | 5.1961 |
| `segment_mae.1` | 4.8276 |
| `segment_mae.2` | 5.3643 |
| `segment_mae.3` | 5.8476 |
| `worst_segment_vs_overall` | 1.1364 |
| `leaky_feature_rmse` | 1.5068 |
| `honest_rmse` | 10.625 |
| `random_split_mae` | 4.5895 |
| `chronological_mae` | 5.1457 |

</details>
