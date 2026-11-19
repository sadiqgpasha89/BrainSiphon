# Cyber Risk Quantification: worked example

> Run on synthetic data with `regression` engine, seed 20403, knobs {"n": 17410, "outlier_share": 0.02, "drift": 0.274}, in 3.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Estimate annualised loss exposure from cyber events by combining threat likelihood, control strength and asset impact, to justify security investments.

**Constraints that shape the design.** Sparse loss data; Expert elicitation; Defensible assumptions

**Label in this use case.** For "Cyber Risk Quantification": Estimate annualised loss exposure from cyber events by combining threat likelihood, control strength and asset impact, to justify security investments. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Few incidents to validate.

## 2. Choose the signals

Your strongest signal is **Control coverage and efficacy** (detection and prevention rates by control). Its rule: Telemetry. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 10.64 to 1.56, which looks like a breakthrough and is leakage. A random split reports MAE 4.30 against 4.97 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 7.32; the boosted model 4.97, a gain of 32.1%. Its 80% interval covers 66.7% of outcomes. The hardest segment has an error 1.25 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 7.32 |
| MAE, boosted challenger | 4.97 |
| MAE gain over the baseline | 32.1% |
| 80% interval coverage | 66.7% |
| Worst segment versus overall MAE | 1.25x |
| RMSE with a leaky column versus honest | 1.56 vs 10.64 |

## 5. An edge case from the blueprint

**Black-swan events outside historical data.** tail underestimated. Planned response: Scenario analysis and heavy-tailed severity distributions. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 17410 |
| `train_rows` | 12187 |
| `test_rows` | 5223 |
| `baseline_ridge.mae` | 7.3224 |
| `baseline_ridge.rmse` | 12.496 |
| `baseline_ridge.wape` | 0.13912 |
| `baseline_ridge.r2` | 0.44473 |
| `challenger_gbm.mae` | 4.9707 |
| `challenger_gbm.rmse` | 10.639 |
| `challenger_gbm.wape` | 0.094443 |
| `challenger_gbm.r2` | 0.59753 |
| `mae_gain_vs_baseline` | 0.32116 |
| `interval_80_coverage` | 0.66743 |
| `interval_80_mean_width` | 9.2465 |
| `segment_mae.0` | 4.8333 |
| `segment_mae.1` | 5.0232 |
| `segment_mae.2` | 4.8831 |
| `segment_mae.3` | 6.1986 |
| `worst_segment_vs_overall` | 1.247 |
| `leaky_feature_rmse` | 1.5555 |
| `honest_rmse` | 10.639 |
| `random_split_mae` | 4.2951 |
| `chronological_mae` | 4.9707 |

</details>
