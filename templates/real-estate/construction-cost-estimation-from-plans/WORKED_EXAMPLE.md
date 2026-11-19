# Construction Cost Estimation from Plans: worked example

> Run on synthetic data with `regression` engine, seed 57797, knobs {"n": 25960, "outlier_share": 0.019, "drift": 0.373}, in 4.0 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Estimate construction cost early from drawings, specifications and past projects, with quantity take-off support.

**Constraints that shape the design.** Every estimate is a range with a stated confidence and never a single number; Assumptions on spec, site and escalation are listed with the estimate; A cost estimator reviews and approves before use

**Label in this use case.** For "Construction Cost Estimation from Plans": Estimate construction cost early from drawings, specifications and past projects, with quantity take-off support. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: The final cost in the data includes changes, so it is not the cost of the plan as drawn.

## 2. Choose the signals

Your strongest signal is **Gross area and storeys** (gross floor area and number of storeys read from the plans). Its rule: Plans differ on what counts as gross, so define it. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 9.41 to 1.75, which looks like a breakthrough and is leakage. A random split reports MAE 4.09 against 4.86 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 7.12; the boosted model 4.86, a gain of 31.7%. Its 80% interval covers 61.5% of outcomes. The hardest segment has an error 1.20 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 7.12 |
| MAE, boosted challenger | 4.86 |
| MAE gain over the baseline | 31.7% |
| 80% interval coverage | 61.5% |
| Worst segment versus overall MAE | 1.20x |
| RMSE with a leaky column versus honest | 1.75 vs 9.41 |

## 5. An edge case from the blueprint

**Early design.** Early design stages have little detail so a point estimate is false precision. Planned response: Show a wide range and narrow it as the design develops. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 25960 |
| `train_rows` | 18172 |
| `test_rows` | 7788 |
| `baseline_ridge.mae` | 7.1221 |
| `baseline_ridge.rmse` | 11.596 |
| `baseline_ridge.wape` | 0.13487 |
| `baseline_ridge.r2` | 0.50348 |
| `challenger_gbm.mae` | 4.8645 |
| `challenger_gbm.rmse` | 9.4103 |
| `challenger_gbm.wape` | 0.092116 |
| `challenger_gbm.r2` | 0.67302 |
| `mae_gain_vs_baseline` | 0.31698 |
| `interval_80_coverage` | 0.61454 |
| `interval_80_mean_width` | 8.8386 |
| `segment_mae.0` | 4.9906 |
| `segment_mae.1` | 4.7457 |
| `segment_mae.2` | 4.3792 |
| `segment_mae.3` | 5.8139 |
| `worst_segment_vs_overall` | 1.1952 |
| `leaky_feature_rmse` | 1.7497 |
| `honest_rmse` | 9.4103 |
| `random_split_mae` | 4.0897 |
| `chronological_mae` | 4.8645 |

</details>
