# Site Selection for Retail & Logistics: worked example

> Run on synthetic data with `regression` engine, seed 83969, knobs {"n": 20900, "outlier_share": 0.027, "drift": 0.239}, in 2.3 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Rank candidate locations for a store or warehouse by expected revenue or cost, using demographics, mobility, competition and network fit.

**Constraints that shape the design.** No protected attributes or close proxies in demand models; Cannibalisation of the company's own sites is modelled and shown; Data licences for mobility and demographic data are respected

**Label in this use case.** For "Site Selection for Retail & Logistics": Rank candidate locations for a store or warehouse by expected revenue or cost, using demographics, mobility, competition and network fit. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Survivor sites are those that were opened and kept, so failed locations are missing from the data.

## 2. Choose the signals

Your strongest signal is **Catchment population** (residents within a 15-minute drive weighted by purchasing power). Its rule: Census data age, so adjust with recent growth. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 11.40 to 1.53, which looks like a breakthrough and is leakage. A random split reports MAE 4.59 against 5.14 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 7.52; the boosted model 5.14, a gain of 31.7%. Its 80% interval covers 68.3% of outcomes. The hardest segment has an error 1.30 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 7.52 |
| MAE, boosted challenger | 5.14 |
| MAE gain over the baseline | 31.7% |
| 80% interval coverage | 68.3% |
| Worst segment versus overall MAE | 1.30x |
| RMSE with a leaky column versus honest | 1.53 vs 11.40 |

## 5. An edge case from the blueprint

**New market.** A new market has no existing stores to learn from. Planned response: Use priors from similar markets and widen the intervals. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 20900 |
| `train_rows` | 14629 |
| `test_rows` | 6271 |
| `baseline_ridge.mae` | 7.5165 |
| `baseline_ridge.rmse` | 13.089 |
| `baseline_ridge.wape` | 0.14151 |
| `baseline_ridge.r2` | 0.40868 |
| `challenger_gbm.mae` | 5.1364 |
| `challenger_gbm.rmse` | 11.401 |
| `challenger_gbm.wape` | 0.096704 |
| `challenger_gbm.r2` | 0.55138 |
| `mae_gain_vs_baseline` | 0.31665 |
| `interval_80_coverage` | 0.68314 |
| `interval_80_mean_width` | 9.2686 |
| `segment_mae.0` | 5.1477 |
| `segment_mae.1` | 5.0977 |
| `segment_mae.2` | 4.6654 |
| `segment_mae.3` | 6.6845 |
| `worst_segment_vs_overall` | 1.3014 |
| `leaky_feature_rmse` | 1.5264 |
| `honest_rmse` | 11.401 |
| `random_split_mae` | 4.5853 |
| `chronological_mae` | 5.1364 |

</details>
