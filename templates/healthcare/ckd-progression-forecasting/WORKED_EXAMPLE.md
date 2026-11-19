# Chronic Kidney Disease Progression Forecasting: worked example

> Run on synthetic data with `survival` engine, seed 78364, knobs {"n": 9670, "dropout": 0.219}, in 0.1 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast eGFR trajectories and kidney failure risk to trigger timely nephrology referral and therapy.

**Constraints that shape the design.** Irregular labs; Explainability for clinicians; Fairness across race-free equations

**Label in this use case.** For "Chronic Kidney Disease Progression Forecasting": Forecast eGFR trajectories and kidney failure risk to trigger timely nephrology referral and therapy. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Informative missingness of labs.

## 2. Choose the signals

Your strongest signal is **eGFR slope** (linear mixed-model slope over 2 years). Its rule: Observations before index. In the starter, the closest executable idea is **risk factor (x0)**: raises the hazard. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

36% of subjects are censored: recent cohorts have simply not been observed long enough. Counting them as non-events gives 45.1% by month 12; dropping the incomplete ones gives 71.1%; the Kaplan-Meier estimate is 52.8%.

## 4. Baseline against the stronger design

A discrete-time hazard model trained on earlier cohorts ranks later cohorts with a concordance index of 0.729 and predicts a mean 52.5% risk, within 1.7% of observed by decile.

| Result | Value |
|---|---|
| Event rate by month 12 (Kaplan-Meier) | 52.8% |
| Counting censored as non-events | 45.1% |
| Dropping subjects not yet observed for a full period | 71.1% |
| Concordance index | 0.729 |
| Mean decile calibration gap | 1.7% |

## 5. An edge case from the blueprint

**Lab assay change.** step shift in creatinine. Planned response: Assay-version metadata and harmonisation. Write the test that replays this case through your pipeline before you tune anything.

## 6. What to expect on your own data

Always model censoring explicitly and split by entry cohort. Re-check calibration by vintage once real defaults or churn mature.

## 7. Do this next

1. `cd starter && make setup && make demo` to reproduce the table above.
2. Replace the synthetic generator with an extract of your data and keep the split, the leakage tests and the gates.
3. Run through `docs/02-delivery-plan.md` milestone by milestone; each exit gate is a number you can check.

<details>
<summary>Every number from this run</summary>

| Metric | Value |
|---|---|
| `subjects` | 9670 |
| `train_subjects` | 6285 |
| `test_subjects` | 3385 |
| `event_share` | 0.63723 |
| `censored_share` | 0.36277 |
| `at_month` | 12 |
| `km_event_rate` | 0.52814 |
| `naive_drop_censored_event_rate` | 0.71089 |
| `naive_bias_vs_km` | 0.18275 |
| `count_all_rows_event_rate` | 0.45111 |
| `count_all_rows_bias_vs_km` | -0.077036 |
| `discrete_time_mean_predicted_risk` | 0.52521 |
| `c_index` | 0.72853 |
| `decile_calibration_mean_abs_gap` | 0.017166 |
| `decile_calibration_max_abs_gap` | 0.043657 |

</details>
