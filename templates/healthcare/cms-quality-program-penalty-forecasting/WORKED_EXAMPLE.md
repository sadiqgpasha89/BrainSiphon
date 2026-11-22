# CMS Quality Program Penalty Forecasting: worked example

> Run on synthetic data with `regression` engine, seed 76391, knobs {"n": 16040, "outlier_share": 0.013, "drift": 0.358}, in 10.9 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Estimate potential financial exposure under applicable quality-linked payment programs by combining current program rules with validated performance data, clearly labelled as scenario estimates and never as official determinations.

**Constraints that shape the design.** A transparent deterministic policy calculator is the base and predictive uncertainty sits on top of the inputs; Rules are versioned by program year and cite their source; Finance and compliance validate assumptions and every output is labelled as an estimate not an official determination

**Label in this use case.** For "CMS Quality Program Penalty Forecasting": Estimate potential financial exposure under applicable quality-linked payment programs by combining current program rules with validated performance data, clearly labelled as scenario estimates and never as official determinations. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Calling a statistical estimate the penalty.

## 2. Choose the signals

Your strongest signal is **Measure score gap to benchmark** (distance from achievement and improvement thresholds). Its rule: Benchmarks of the right year. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 8.81 to 1.89, which looks like a breakthrough and is leakage. A random split reports MAE 4.05 against 4.68 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 6.86; the boosted model 4.68, a gain of 31.8%. Its 80% interval covers 62.0% of outcomes. The hardest segment has an error 1.21 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 6.86 |
| MAE, boosted challenger | 4.68 |
| MAE gain over the baseline | 31.8% |
| 80% interval coverage | 62.0% |
| Worst segment versus overall MAE | 1.21x |
| RMSE with a leaky column versus honest | 1.89 vs 8.81 |

## 5. An edge case from the blueprint

**Program rule change mid-year.** outputs use stale rules. Planned response: Rule version check with a mandatory refresh on publication. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 16040 |
| `train_rows` | 11228 |
| `test_rows` | 4812 |
| `baseline_ridge.mae` | 6.8605 |
| `baseline_ridge.rmse` | 10.913 |
| `baseline_ridge.wape` | 0.13066 |
| `baseline_ridge.r2` | 0.52895 |
| `challenger_gbm.mae` | 4.6768 |
| `challenger_gbm.rmse` | 8.8071 |
| `challenger_gbm.wape` | 0.089072 |
| `challenger_gbm.r2` | 0.69323 |
| `mae_gain_vs_baseline` | 0.3183 |
| `interval_80_coverage` | 0.62032 |
| `interval_80_mean_width` | 8.8177 |
| `segment_mae.0` | 4.5618 |
| `segment_mae.1` | 4.5949 |
| `segment_mae.2` | 4.9254 |
| `segment_mae.3` | 5.656 |
| `worst_segment_vs_overall` | 1.2094 |
| `leaky_feature_rmse` | 1.8867 |
| `honest_rmse` | 8.8071 |
| `random_split_mae` | 4.053 |
| `chronological_mae` | 4.6768 |

</details>
