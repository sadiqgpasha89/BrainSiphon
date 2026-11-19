# Logistics Carbon Footprint Estimation: worked example

> Run on synthetic data with `regression` engine, seed 80962, knobs {"n": 16160, "outlier_share": 0.012, "drift": 0.271}, in 2.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Estimate emissions per shipment, lane and product to report accurately and steer decisions toward lower-carbon options.

**Constraints that shape the design.** GLEC / ISO 14083 compliance; Primary vs modelled data transparency; Audit trail

**Label in this use case.** For "Logistics Carbon Footprint Estimation": Estimate emissions per shipment, lane and product to report accurately and steer decisions toward lower-carbon options. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Validated only on own fleet.

## 2. Choose the signals

Your strongest signal is **Load factor** (utilisation of vehicle capacity). Its rule: Weight data. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 8.03 to 1.56, which looks like a breakthrough and is leakage. A random split reports MAE 3.75 against 4.23 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 6.66; the boosted model 4.23, a gain of 36.5%. Its 80% interval covers 65.6% of outcomes. The hardest segment has an error 1.50 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 6.66 |
| MAE, boosted challenger | 4.23 |
| MAE gain over the baseline | 36.5% |
| 80% interval coverage | 65.6% |
| Worst segment versus overall MAE | 1.50x |
| RMSE with a leaky column versus honest | 1.56 vs 8.03 |

## 5. An edge case from the blueprint

**Missing primary data for subcontracted legs.** defaults used silently. Planned response: Data-quality tiers displayed with estimates. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 16160 |
| `train_rows` | 11312 |
| `test_rows` | 4848 |
| `baseline_ridge.mae` | 6.6618 |
| `baseline_ridge.rmse` | 10.449 |
| `baseline_ridge.wape` | 0.12643 |
| `baseline_ridge.r2` | 0.53619 |
| `challenger_gbm.mae` | 4.2314 |
| `challenger_gbm.rmse` | 8.0318 |
| `challenger_gbm.wape` | 0.080304 |
| `challenger_gbm.r2` | 0.72598 |
| `mae_gain_vs_baseline` | 0.36483 |
| `interval_80_coverage` | 0.65553 |
| `interval_80_mean_width` | 8.6239 |
| `segment_mae.0` | 4.2858 |
| `segment_mae.1` | 4.0579 |
| `segment_mae.2` | 3.7795 |
| `segment_mae.3` | 6.3326 |
| `worst_segment_vs_overall` | 1.4966 |
| `leaky_feature_rmse` | 1.564 |
| `honest_rmse` | 8.0318 |
| `random_split_mae` | 3.7454 |
| `chronological_mae` | 4.2314 |

</details>
