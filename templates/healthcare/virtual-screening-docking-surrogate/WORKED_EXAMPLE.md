# Virtual Screening with Docking Surrogates: worked example

> Run on synthetic data with `regression` engine, seed 10070, knobs {"n": 22590, "outlier_share": 0.026, "drift": 0.344}, in 3.9 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Screen billion-molecule libraries by training fast surrogate models on docking scores, then dock only the top fraction.

**Constraints that shape the design.** Compute budget; Target-specific models; Enrichment at top 0.1%

**Label in this use case.** For "Virtual Screening with Docking Surrogates": Screen billion-molecule libraries by training fast surrogate models on docking scores, then dock only the top fraction. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training and test molecules share scaffolds.

## 2. Choose the signals

Your strongest signal is **Surrogate rank score** (model predicted docking rank). Its rule: Calibrate on top tail. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 11.13 to 1.50, which looks like a breakthrough and is leakage. A random split reports MAE 4.64 against 5.38 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 7.68; the boosted model 5.38, a gain of 30.0%. Its 80% interval covers 64.0% of outcomes. The hardest segment has an error 1.24 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 7.68 |
| MAE, boosted challenger | 5.38 |
| MAE gain over the baseline | 30.0% |
| 80% interval coverage | 64.0% |
| Worst segment versus overall MAE | 1.24x |
| RMSE with a leaky column versus honest | 1.50 vs 11.13 |

## 5. An edge case from the blueprint

**Receptor conformation changes.** surrogate trained on wrong pocket. Planned response: Ensemble of receptor conformers. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 22590 |
| `train_rows` | 15812 |
| `test_rows` | 6778 |
| `baseline_ridge.mae` | 7.6833 |
| `baseline_ridge.rmse` | 12.986 |
| `baseline_ridge.wape` | 0.1455 |
| `baseline_ridge.r2` | 0.43246 |
| `challenger_gbm.mae` | 5.3811 |
| `challenger_gbm.rmse` | 11.131 |
| `challenger_gbm.wape` | 0.1019 |
| `challenger_gbm.r2` | 0.58301 |
| `mae_gain_vs_baseline` | 0.29964 |
| `interval_80_coverage` | 0.63972 |
| `interval_80_mean_width` | 9.2259 |
| `segment_mae.0` | 5.2487 |
| `segment_mae.1` | 5.0958 |
| `segment_mae.2` | 5.9806 |
| `segment_mae.3` | 6.6708 |
| `worst_segment_vs_overall` | 1.2397 |
| `leaky_feature_rmse` | 1.4976 |
| `honest_rmse` | 11.131 |
| `random_split_mae` | 4.6448 |
| `chronological_mae` | 5.3811 |

</details>
