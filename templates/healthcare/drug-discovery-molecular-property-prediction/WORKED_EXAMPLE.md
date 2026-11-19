# Molecular Property Prediction for Drug Discovery: worked example

> Run on synthetic data with `regression` engine, seed 52085, knobs {"n": 21800, "outlier_share": 0.026, "drift": 0.295}, in 2.0 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict ADMET and activity properties from molecular graphs to prioritise synthesis and cut wet-lab cycles.

**Constraints that shape the design.** Scaffold-split generalisation; Uncertainty estimates; Sparse assay data

**Label in this use case.** For "Molecular Property Prediction for Drug Discovery": Predict ADMET and activity properties from molecular graphs to prioritise synthesis and cut wet-lab cycles. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Random split leakage.

## 2. Choose the signals

Your strongest signal is **Pretrained molecular graph embedding** (GNN encoder pretrained on millions of molecules). Its rule: Check overlap with test scaffolds. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 10.37 to 1.50, which looks like a breakthrough and is leakage. A random split reports MAE 4.38 against 4.86 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 7.28; the boosted model 4.86, a gain of 33.3%. Its 80% interval covers 67.6% of outcomes. The hardest segment has an error 1.27 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 7.28 |
| MAE, boosted challenger | 4.86 |
| MAE gain over the baseline | 33.3% |
| 80% interval coverage | 67.6% |
| Worst segment versus overall MAE | 1.27x |
| RMSE with a leaky column versus honest | 1.50 vs 10.37 |

## 5. An edge case from the blueprint

**Out-of-domain scaffold.** confident wrong predictions. Planned response: Applicability-domain detector and flagged predictions. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 21800 |
| `train_rows` | 15259 |
| `test_rows` | 6541 |
| `baseline_ridge.mae` | 7.2831 |
| `baseline_ridge.rmse` | 12.325 |
| `baseline_ridge.wape` | 0.13751 |
| `baseline_ridge.r2` | 0.45214 |
| `challenger_gbm.mae` | 4.8584 |
| `challenger_gbm.rmse` | 10.375 |
| `challenger_gbm.wape` | 0.091729 |
| `challenger_gbm.r2` | 0.61182 |
| `mae_gain_vs_baseline` | 0.33292 |
| `interval_80_coverage` | 0.67589 |
| `interval_80_mean_width` | 9.2559 |
| `segment_mae.0` | 4.6875 |
| `segment_mae.1` | 5.024 |
| `segment_mae.2` | 4.6736 |
| `segment_mae.3` | 6.1791 |
| `worst_segment_vs_overall` | 1.2718 |
| `leaky_feature_rmse` | 1.5011 |
| `honest_rmse` | 10.375 |
| `random_split_mae` | 4.3842 |
| `chronological_mae` | 4.8584 |

</details>
