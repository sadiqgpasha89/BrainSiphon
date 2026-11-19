# Fuel Consumption Prediction & Eco-Routing: worked example

> Run on synthetic data with `regression` engine, seed 33539, knobs {"n": 21610, "outlier_share": 0.026, "drift": 0.393}, in 2.0 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict vehicle fuel use per route segment and choose routes and speeds that cut fuel and emissions at acceptable time cost.

**Constraints that shape the design.** Time-window feasibility; Emission reporting; Vehicle heterogeneity

**Label in this use case.** For "Fuel Consumption Prediction & Eco-Routing": Predict vehicle fuel use per route segment and choose routes and speeds that cut fuel and emissions at acceptable time cost. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on fuel cards with timing error.

## 2. Choose the signals

Your strongest signal is **Road grade profile** (elevation along route). Its rule: DEM data. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 10.76 to 1.57, which looks like a breakthrough and is leakage. A random split reports MAE 4.74 against 5.49 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 7.68; the boosted model 5.49, a gain of 28.6%. Its 80% interval covers 59.8% of outcomes. The hardest segment has an error 1.21 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 7.68 |
| MAE, boosted challenger | 5.49 |
| MAE gain over the baseline | 28.6% |
| 80% interval coverage | 59.8% |
| Worst segment versus overall MAE | 1.21x |
| RMSE with a leaky column versus honest | 1.57 vs 10.76 |

## 5. An edge case from the blueprint

**Fuel card data misattributed.** fuel purchases are linked to the wrong vehicle, so training labels carry large errors. Planned response: Reconciliation of fuel cards with telematics. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 21610 |
| `train_rows` | 15126 |
| `test_rows` | 6484 |
| `baseline_ridge.mae` | 7.6775 |
| `baseline_ridge.rmse` | 12.628 |
| `baseline_ridge.wape` | 0.1451 |
| `baseline_ridge.r2` | 0.48618 |
| `challenger_gbm.mae` | 5.4853 |
| `challenger_gbm.rmse` | 10.76 |
| `challenger_gbm.wape` | 0.10367 |
| `challenger_gbm.r2` | 0.62696 |
| `mae_gain_vs_baseline` | 0.28554 |
| `interval_80_coverage` | 0.59809 |
| `interval_80_mean_width` | 9.2373 |
| `segment_mae.0` | 5.4826 |
| `segment_mae.1` | 5.3969 |
| `segment_mae.2` | 5.3144 |
| `segment_mae.3` | 6.6588 |
| `worst_segment_vs_overall` | 1.214 |
| `leaky_feature_rmse` | 1.5714 |
| `honest_rmse` | 10.76 |
| `random_split_mae` | 4.7438 |
| `chronological_mae` | 5.4853 |

</details>
