# Alpha Signal Research Pipeline: worked example

> Run on synthetic data with `regression` engine, seed 80973, knobs {"n": 25220, "outlier_share": 0.023, "drift": 0.217}, in 2.4 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Discover and validate cross-sectional return signals that survive costs and decay, and promote them to production with strict overfitting control.

**Constraints that shape the design.** Point-in-time universe including delisted names; Transaction-cost-aware evaluation; Capacity limits

**Label in this use case.** For "Alpha Signal Research Pipeline": Discover and validate cross-sectional return signals that survive costs and decay, and promote them to production with strict overfitting control. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Look-ahead via restated fundamentals.

## 2. Choose the signals

Your strongest signal is **Cross-sectional rank momentum** (rank of 12-1 month return across the universe). Its rule: Skip the most recent month to avoid reversal contamination. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 10.06 to 1.63, which looks like a breakthrough and is leakage. A random split reports MAE 4.27 against 4.60 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 7.19; the boosted model 4.60, a gain of 36.1%. Its 80% interval covers 70.2% of outcomes. The hardest segment has an error 1.35 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 7.19 |
| MAE, boosted challenger | 4.60 |
| MAE gain over the baseline | 36.1% |
| 80% interval coverage | 70.2% |
| Worst segment versus overall MAE | 1.35x |
| RMSE with a leaky column versus honest | 1.63 vs 10.06 |

## 5. An edge case from the blueprint

**Delisting and survivorship.** backtest ignores failed companies. Planned response: Use survivorship-free point-in-time universe. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 25220 |
| `train_rows` | 17654 |
| `test_rows` | 7566 |
| `baseline_ridge.mae` | 7.1919 |
| `baseline_ridge.rmse` | 12.193 |
| `baseline_ridge.wape` | 0.13557 |
| `baseline_ridge.r2` | 0.43102 |
| `challenger_gbm.mae` | 4.5985 |
| `challenger_gbm.rmse` | 10.06 |
| `challenger_gbm.wape` | 0.08668 |
| `challenger_gbm.r2` | 0.61272 |
| `mae_gain_vs_baseline` | 0.3606 |
| `interval_80_coverage` | 0.70169 |
| `interval_80_mean_width` | 9.575 |
| `segment_mae.0` | 4.3656 |
| `segment_mae.1` | 4.828 |
| `segment_mae.2` | 4.3514 |
| `segment_mae.3` | 6.1934 |
| `worst_segment_vs_overall` | 1.3468 |
| `leaky_feature_rmse` | 1.6306 |
| `honest_rmse` | 10.06 |
| `random_split_mae` | 4.2697 |
| `chronological_mae` | 4.5985 |

</details>
