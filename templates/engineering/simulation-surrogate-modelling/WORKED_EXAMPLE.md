# Simulation Surrogate Modelling: worked example

> Run on synthetic data with `regression` engine, seed 34656, knobs {"n": 25220, "outlier_share": 0.027, "drift": 0.291}, in 4.7 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Train fast surrogate models on validated simulations so engineers can explore parameters in seconds, with uncertainty estimates and automatic fallback to the full solver outside the trained range.

**Constraints that shape the design.** Prediction error under 3% within the trained range; Uncertainty shown for every prediction; Fallback to the full solver outside the range

**Label in this use case.** For "Simulation Surrogate Modelling": Train fast surrogate models on validated simulations so engineers can explore parameters in seconds, with uncertainty estimates and automatic fallback to the full solver outside the trained range. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Extrapolation without checks.

## 2. Choose the signals

Your strongest signal is **Input parameter vector** (geometry and load parameters). Its rule: From the design space. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 12.07 to 1.77, which looks like a breakthrough and is leakage. A random split reports MAE 4.76 against 5.50 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 7.90; the boosted model 5.50, a gain of 30.3%. Its 80% interval covers 65.9% of outcomes. The hardest segment has an error 1.24 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 7.90 |
| MAE, boosted challenger | 5.50 |
| MAE gain over the baseline | 30.3% |
| 80% interval coverage | 65.9% |
| Worst segment versus overall MAE | 1.24x |
| RMSE with a leaky column versus honest | 1.77 vs 12.07 |

## 5. An edge case from the blueprint

**Out of range query.** the design is outside trained data. Planned response: Automatic fallback to the solver. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 25220 |
| `train_rows` | 17654 |
| `test_rows` | 7566 |
| `baseline_ridge.mae` | 7.8982 |
| `baseline_ridge.rmse` | 13.841 |
| `baseline_ridge.wape` | 0.14891 |
| `baseline_ridge.r2` | 0.40182 |
| `challenger_gbm.mae` | 5.5021 |
| `challenger_gbm.rmse` | 12.075 |
| `challenger_gbm.wape` | 0.10373 |
| `challenger_gbm.r2` | 0.54479 |
| `mae_gain_vs_baseline` | 0.30338 |
| `interval_80_coverage` | 0.6594 |
| `interval_80_mean_width` | 9.5332 |
| `segment_mae.0` | 5.5394 |
| `segment_mae.1` | 5.4324 |
| `segment_mae.2` | 5.0868 |
| `segment_mae.3` | 6.8212 |
| `worst_segment_vs_overall` | 1.2398 |
| `leaky_feature_rmse` | 1.7727 |
| `honest_rmse` | 12.075 |
| `random_split_mae` | 4.7601 |
| `chronological_mae` | 5.5021 |

</details>
