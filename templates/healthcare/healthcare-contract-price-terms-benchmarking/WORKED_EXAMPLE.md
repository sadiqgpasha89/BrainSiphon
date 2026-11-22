# Healthcare Contract Price & Terms Benchmarking: worked example

> Run on synthetic data with `regression` engine, seed 54926, knobs {"n": 25960, "outlier_share": 0.013, "drift": 0.235}, in 15.2 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Compare contract pricing and terms across the organisation's portfolio and approved benchmark datasets, building comparable cohorts so reviewers see normalised variance and unfavourable terms with stated confidence.

**Constraints that shape the design.** Legal and procurement validate comparability and the right to use each benchmark source; Comparisons show cohort definition, sample size and confidence; Prices are normalised for unit, tier, geography and term

**Label in this use case.** For "Healthcare Contract Price & Terms Benchmarking": Compare contract pricing and terms across the organisation's portfolio and approved benchmark datasets, building comparable cohorts so reviewers see normalised variance and unfavourable terms with stated confidence. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Comparing unnormalised units.

## 2. Choose the signals

Your strongest signal is **Normalised price percentile** (position of the price within the comparable cohort). Its rule: Cohort at the contract date. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 8.65 to 1.76, which looks like a breakthrough and is leakage. A random split reports MAE 3.63 against 4.23 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 6.81; the boosted model 4.23, a gain of 38.0%. Its 80% interval covers 68.0% of outcomes. The hardest segment has an error 1.15 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 6.81 |
| MAE, boosted challenger | 4.23 |
| MAE gain over the baseline | 38.0% |
| 80% interval coverage | 68.0% |
| Worst segment versus overall MAE | 1.15x |
| RMSE with a leaky column versus honest | 1.76 vs 8.65 |

## 5. An edge case from the blueprint

**Few comparables.** the benchmark is unreliable. Planned response: Minimum cohort size and a low-confidence label. Write the test that replays this case through your pipeline before you tune anything.

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
| `baseline_ridge.mae` | 6.8148 |
| `baseline_ridge.rmse` | 11.045 |
| `baseline_ridge.wape` | 0.12931 |
| `baseline_ridge.r2` | 0.50313 |
| `challenger_gbm.mae` | 4.227 |
| `challenger_gbm.rmse` | 8.6472 |
| `challenger_gbm.wape` | 0.080205 |
| `challenger_gbm.r2` | 0.69547 |
| `mae_gain_vs_baseline` | 0.37973 |
| `interval_80_coverage` | 0.68028 |
| `interval_80_mean_width` | 8.7792 |
| `segment_mae.0` | 4.05 |
| `segment_mae.1` | 4.3513 |
| `segment_mae.2` | 4.3088 |
| `segment_mae.3` | 4.8399 |
| `worst_segment_vs_overall` | 1.145 |
| `leaky_feature_rmse` | 1.764 |
| `honest_rmse` | 8.6472 |
| `random_split_mae` | 3.6347 |
| `chronological_mae` | 4.227 |

</details>
