# Dynamic Pricing Optimisation: worked example

> Run on synthetic data with `regression` engine, seed 78122, knobs {"n": 16270, "outlier_share": 0.02, "drift": 0.172}, in 1.8 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Set prices per SKU and channel to maximise margin dollars under inventory, competitor and brand-guardrail constraints.

**Constraints that shape the design.** Price-change frequency limits; Legal price-parity rules; Customer trust

**Label in this use case.** For "Dynamic Pricing Optimisation": Set prices per SKU and channel to maximise margin dollars under inventory, competitor and brand-guardrail constraints. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Elasticities estimated from observational price changes.

## 2. Choose the signals

Your strongest signal is **Own-price elasticity** (log-log slope from randomised price cells). Its rule: Randomisation required for validity. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 9.35 to 1.38, which looks like a breakthrough and is leakage. A random split reports MAE 4.27 against 4.26 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 6.93; the boosted model 4.26, a gain of 38.5%. Its 80% interval covers 71.7% of outcomes. The hardest segment has an error 1.44 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 6.93 |
| MAE, boosted challenger | 4.26 |
| MAE gain over the baseline | 38.5% |
| 80% interval coverage | 71.7% |
| Worst segment versus overall MAE | 1.44x |
| RMSE with a leaky column versus honest | 1.38 vs 9.35 |

## 5. An edge case from the blueprint

**Competitor scraper returns wrong match.** system chases bad price. Planned response: Match-confidence gating and outlier clipping. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 16270 |
| `train_rows` | 11389 |
| `test_rows` | 4881 |
| `baseline_ridge.mae` | 6.9272 |
| `baseline_ridge.rmse` | 11.534 |
| `baseline_ridge.wape` | 0.1308 |
| `baseline_ridge.r2` | 0.45594 |
| `challenger_gbm.mae` | 4.2598 |
| `challenger_gbm.rmse` | 9.3476 |
| `challenger_gbm.wape` | 0.080433 |
| `challenger_gbm.r2` | 0.64267 |
| `mae_gain_vs_baseline` | 0.38506 |
| `interval_80_coverage` | 0.71748 |
| `interval_80_mean_width` | 9.167 |
| `segment_mae.0` | 4.2618 |
| `segment_mae.1` | 4.2123 |
| `segment_mae.2` | 3.7036 |
| `segment_mae.3` | 6.1386 |
| `worst_segment_vs_overall` | 1.441 |
| `leaky_feature_rmse` | 1.3785 |
| `honest_rmse` | 9.3476 |
| `random_split_mae` | 4.266 |
| `chronological_mae` | 4.2598 |

</details>
