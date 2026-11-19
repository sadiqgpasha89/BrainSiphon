# Vehicle Damage Estimation from Photos: worked example

> Run on synthetic data with `regression` engine, seed 67413, knobs {"n": 18940, "outlier_share": 0.039, "drift": 0.19}, in 3.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Estimate repair cost from customer photos within seconds, enabling instant settlement of simple claims.

**Constraints that shape the design.** Settlement accuracy within 10%; Photo fraud detection; Works with phone photos in poor light

**Label in this use case.** For "Vehicle Damage Estimation from Photos": Estimate repair cost from customer photos within seconds, enabling instant settlement of simple claims. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on estimates instead of final invoices.

## 2. Choose the signals

Your strongest signal is **Damaged part segmentation** (mask and severity per vehicle part). Its rule: Use a part taxonomy per model year. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 12.74 to 1.67, which looks like a breakthrough and is leakage. A random split reports MAE 5.28 against 5.50 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 8.01; the boosted model 5.50, a gain of 31.4%. Its 80% interval covers 71.8% of outcomes. The hardest segment has an error 1.36 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 8.01 |
| MAE, boosted challenger | 5.50 |
| MAE gain over the baseline | 31.4% |
| 80% interval coverage | 71.8% |
| Worst segment versus overall MAE | 1.36x |
| RMSE with a leaky column versus honest | 1.67 vs 12.74 |

## 5. An edge case from the blueprint

**Pre-existing damage.** prior damage is counted. Planned response: Cross-check against previous claims and photo history. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 18940 |
| `train_rows` | 13258 |
| `test_rows` | 5682 |
| `baseline_ridge.mae` | 8.0138 |
| `baseline_ridge.rmse` | 14.453 |
| `baseline_ridge.wape` | 0.15163 |
| `baseline_ridge.r2` | 0.36025 |
| `challenger_gbm.mae` | 5.497 |
| `challenger_gbm.rmse` | 12.741 |
| `challenger_gbm.wape` | 0.10401 |
| `challenger_gbm.r2` | 0.50284 |
| `mae_gain_vs_baseline` | 0.31406 |
| `interval_80_coverage` | 0.71771 |
| `interval_80_mean_width` | 10.007 |
| `segment_mae.0` | 5.3331 |
| `segment_mae.1` | 5.1163 |
| `segment_mae.2` | 6.1259 |
| `segment_mae.3` | 7.4637 |
| `worst_segment_vs_overall` | 1.3578 |
| `leaky_feature_rmse` | 1.675 |
| `honest_rmse` | 12.741 |
| `random_split_mae` | 5.276 |
| `chronological_mae` | 5.497 |

</details>
