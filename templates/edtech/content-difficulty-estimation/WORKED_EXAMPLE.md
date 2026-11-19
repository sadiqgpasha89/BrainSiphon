# Learning Content Difficulty Estimation: worked example

> Run on synthetic data with `regression` engine, seed 84402, knobs {"n": 17330, "outlier_share": 0.034, "drift": 0.232}, in 3.3 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Estimate difficulty of questions, passages and videos from text and response data so content is correctly levelled.

**Constraints that shape the design.** Cold-start items without responses; Age-appropriateness; Multilingual

**Label in this use case.** For "Learning Content Difficulty Estimation": Estimate difficulty of questions, passages and videos from text and response data so content is correctly levelled. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Calibration on one population.

## 2. Choose the signals

Your strongest signal is **Linguistic complexity features** (syntactic and lexical complexity). Its rule: Parser. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 11.83 to 1.66, which looks like a breakthrough and is leakage. A random split reports MAE 4.78 against 5.20 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 7.61; the boosted model 5.20, a gain of 31.6%. Its 80% interval covers 68.7% of outcomes. The hardest segment has an error 1.43 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 7.61 |
| MAE, boosted challenger | 5.20 |
| MAE gain over the baseline | 31.6% |
| 80% interval coverage | 68.7% |
| Worst segment versus overall MAE | 1.43x |
| RMSE with a leaky column versus honest | 1.66 vs 11.83 |

## 5. An edge case from the blueprint

**Cultural references make items harder for some groups.** biased difficulty. Planned response: DIF checks and content review. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 17330 |
| `train_rows` | 12131 |
| `test_rows` | 5199 |
| `baseline_ridge.mae` | 7.6065 |
| `baseline_ridge.rmse` | 13.51 |
| `baseline_ridge.wape` | 0.14389 |
| `baseline_ridge.r2` | 0.38404 |
| `challenger_gbm.mae` | 5.2036 |
| `challenger_gbm.rmse` | 11.832 |
| `challenger_gbm.wape` | 0.098433 |
| `challenger_gbm.r2` | 0.52752 |
| `mae_gain_vs_baseline` | 0.3159 |
| `interval_80_coverage` | 0.68744 |
| `interval_80_mean_width` | 9.4524 |
| `segment_mae.0` | 5.1173 |
| `segment_mae.1` | 4.9293 |
| `segment_mae.2` | 5.3456 |
| `segment_mae.3` | 7.4219 |
| `worst_segment_vs_overall` | 1.4263 |
| `leaky_feature_rmse` | 1.6644 |
| `honest_rmse` | 11.832 |
| `random_split_mae` | 4.7793 |
| `chronological_mae` | 5.2036 |

</details>
