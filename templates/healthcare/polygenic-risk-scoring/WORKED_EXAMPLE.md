# Polygenic Risk Scoring: worked example

> Run on synthetic data with `regression` engine, seed 51199, knobs {"n": 18710, "outlier_share": 0.01, "drift": 0.323}, in 1.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Combine genome-wide variant effects into calibrated disease risk scores that are valid across ancestries and actionable for prevention programmes.

**Constraints that shape the design.** Ancestry portability; Calibration in absolute risk; Consent and genomic privacy

**Label in this use case.** For "Polygenic Risk Scoring": Combine genome-wide variant effects into calibrated disease risk scores that are valid across ancestries and actionable for prevention programmes. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Validating in the same biobank used for GWAS.

## 2. Choose the signals

Your strongest signal is **Shrunk SNP effect sizes** (LDpred2 or PRS-CS posterior effects). Its rule: Use external GWAS only. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 8.41 to 2.16, which looks like a breakthrough and is leakage. A random split reports MAE 3.65 against 4.36 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 6.79; the boosted model 4.36, a gain of 35.7%. Its 80% interval covers 63.8% of outcomes. The hardest segment has an error 1.20 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 6.79 |
| MAE, boosted challenger | 4.36 |
| MAE gain over the baseline | 35.7% |
| 80% interval coverage | 63.8% |
| Worst segment versus overall MAE | 1.20x |
| RMSE with a leaky column versus honest | 2.16 vs 8.41 |

## 5. An edge case from the blueprint

**Sample overlap between GWAS and target.** inflated performance. Planned response: Strict cohort separation and overlap checks. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 18710 |
| `train_rows` | 13097 |
| `test_rows` | 5613 |
| `baseline_ridge.mae` | 6.7863 |
| `baseline_ridge.rmse` | 10.85 |
| `baseline_ridge.wape` | 0.12875 |
| `baseline_ridge.r2` | 0.51678 |
| `challenger_gbm.mae` | 4.3641 |
| `challenger_gbm.rmse` | 8.412 |
| `challenger_gbm.wape` | 0.082793 |
| `challenger_gbm.r2` | 0.70954 |
| `mae_gain_vs_baseline` | 0.35693 |
| `interval_80_coverage` | 0.63763 |
| `interval_80_mean_width` | 8.5075 |
| `segment_mae.0` | 3.9643 |
| `segment_mae.1` | 4.6757 |
| `segment_mae.2` | 4.7267 |
| `segment_mae.3` | 5.2337 |
| `worst_segment_vs_overall` | 1.1993 |
| `leaky_feature_rmse` | 2.1632 |
| `honest_rmse` | 8.412 |
| `random_split_mae` | 3.6539 |
| `chronological_mae` | 4.3641 |

</details>
