# Neighbourhood Quality Scoring: worked example

> Run on synthetic data with `regression` engine, seed 31976, knobs {"n": 24710, "outlier_share": 0.035, "drift": 0.368}, in 4.0 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Score each neighbourhood on walkability, amenities, safety perception, noise and change so buyers and investors can compare areas.

**Constraints that shape the design.** No score may use race, ethnicity, religion or any proxy for them; Method and inputs published so a resident can challenge a score; Quarterly refresh without rank churn from noise alone

**Label in this use case.** For "Neighbourhood Quality Scoring": Score each neighbourhood on walkability, amenities, safety perception, noise and change so buyers and investors can compare areas. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Survey calibration data covers wealthy and responsive areas better than others.

## 2. Choose the signals

Your strongest signal is **Walk time to amenities** (routing time on the pedestrian network to the nearest grocery, school, park and transit stop). Its rule: Use the current map snapshot for training labels and do not mix in later openings. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 12.82 to 1.59, which looks like a breakthrough and is leakage. A random split reports MAE 5.10 against 6.09 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 8.32; the boosted model 6.09, a gain of 26.9%. Its 80% interval covers 62.3% of outcomes. The hardest segment has an error 1.22 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 8.32 |
| MAE, boosted challenger | 6.09 |
| MAE gain over the baseline | 26.9% |
| 80% interval coverage | 62.3% |
| Worst segment versus overall MAE | 1.22x |
| RMSE with a leaky column versus honest | 1.59 vs 12.82 |

## 5. An edge case from the blueprint

**New development.** A new development has no history so its area score cannot be computed. Planned response: Use priors from comparable areas and mark the score as provisional. Write the test that replays this case through your pipeline before you tune anything.

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
| `baseline_ridge.mae` | 8.3241 |
| `baseline_ridge.rmse` | 14.586 |
| `baseline_ridge.wape` | 0.15789 |
| `baseline_ridge.r2` | 0.39791 |
| `challenger_gbm.mae` | 6.0876 |
| `challenger_gbm.rmse` | 12.824 |
| `challenger_gbm.wape` | 0.11547 |
| `challenger_gbm.r2` | 0.53457 |
| `mae_gain_vs_baseline` | 0.26867 |
| `interval_80_coverage` | 0.62309 |
| `interval_80_mean_width` | 9.6419 |
| `segment_mae.0` | 5.8632 |
| `segment_mae.1` | 6.14 |
| `segment_mae.2` | 6.3032 |
| `segment_mae.3` | 7.4036 |
| `worst_segment_vs_overall` | 1.2162 |
| `leaky_feature_rmse` | 1.5893 |
| `honest_rmse` | 12.824 |
| `random_split_mae` | 5.0987 |
| `chronological_mae` | 6.0876 |

</details>
