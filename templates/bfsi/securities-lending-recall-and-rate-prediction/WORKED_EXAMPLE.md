# Securities Lending Recall & Rate Prediction: worked example

> Run on synthetic data with `regression` engine, seed 35595, knobs {"n": 25840, "outlier_share": 0.024, "drift": 0.304}, in 3.0 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict lending demand, fee rates and recall risk per security so the lending desk prices loans and holds back what it expects to need.

**Constraints that shape the design.** Beneficial owner restrictions respected; Daily run before market open; Explainable to the desk

**Label in this use case.** For "Securities Lending Recall & Rate Prediction": Predict lending demand, fee rates and recall risk per security so the lending desk prices loans and holds back what it expects to need. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Survivorship in security lists.

## 2. Choose the signals

Your strongest signal is **Utilisation trend** (change in the share of lendable inventory on loan). Its rule: Data lags by a day. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 10.43 to 1.49, which looks like a breakthrough and is leakage. A random split reports MAE 4.45 against 4.93 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 7.22; the boosted model 4.93, a gain of 31.7%. Its 80% interval covers 65.2% of outcomes. The hardest segment has an error 1.26 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 7.22 |
| MAE, boosted challenger | 4.93 |
| MAE gain over the baseline | 31.7% |
| 80% interval coverage | 65.2% |
| Worst segment versus overall MAE | 1.26x |
| RMSE with a leaky column versus honest | 1.49 vs 10.43 |

## 5. An edge case from the blueprint

**Short squeeze.** fees spike far beyond history. Planned response: Regime flag and cap on suggested pricing. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 25840 |
| `train_rows` | 18088 |
| `test_rows` | 7752 |
| `baseline_ridge.mae` | 7.2151 |
| `baseline_ridge.rmse` | 12.356 |
| `baseline_ridge.wape` | 0.13775 |
| `baseline_ridge.r2` | 0.45556 |
| `challenger_gbm.mae` | 4.9304 |
| `challenger_gbm.rmse` | 10.435 |
| `challenger_gbm.wape` | 0.094128 |
| `challenger_gbm.r2` | 0.61172 |
| `mae_gain_vs_baseline` | 0.31666 |
| `interval_80_coverage` | 0.65235 |
| `interval_80_mean_width` | 9.1498 |
| `segment_mae.0` | 4.7415 |
| `segment_mae.1` | 4.9943 |
| `segment_mae.2` | 5.0439 |
| `segment_mae.3` | 6.2216 |
| `worst_segment_vs_overall` | 1.2619 |
| `leaky_feature_rmse` | 1.4944 |
| `honest_rmse` | 10.435 |
| `random_split_mae` | 4.4535 |
| `chronological_mae` | 4.9304 |

</details>
