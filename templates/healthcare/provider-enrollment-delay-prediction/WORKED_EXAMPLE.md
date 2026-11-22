# Provider Enrollment Delay Prediction: worked example

> Run on synthetic data with `survival` engine, seed 82740, knobs {"n": 7690, "dropout": 0.288}, in 0.7 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict payer enrollment and roster delays that affect network participation, scheduling and reimbursement, and tell enrollment specialists the likely bottleneck and next best follow-up.

**Constraints that shape the design.** Predictions are segmented by payer and process type; Specialists validate payer status and the model never states a guarantee of participation or reimbursement; Time-to-event labels keep censoring for open applications

**Label in this use case.** For "Provider Enrollment Delay Prediction": Predict payer enrollment and roster delays that affect network participation, scheduling and reimbursement, and tell enrollment specialists the likely bottleneck and next best follow-up. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Starting the clock before the file is complete.

## 2. Choose the signals

Your strongest signal is **Completeness at submission** (share of required items present on submission). Its rule: As of the submission event. In the starter, the closest executable idea is **risk factor (x0)**: raises the hazard. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

39% of subjects are censored: recent cohorts have simply not been observed long enough. Counting them as non-events gives 42.4% by month 12; dropping the incomplete ones gives 70.9%; the Kaplan-Meier estimate is 50.5%.

## 4. Baseline against the stronger design

A discrete-time hazard model trained on earlier cohorts ranks later cohorts with a concordance index of 0.728 and predicts a mean 51.5% risk, within 2.8% of observed by decile.

| Result | Value |
|---|---|
| Event rate by month 12 (Kaplan-Meier) | 50.5% |
| Counting censored as non-events | 42.4% |
| Dropping subjects not yet observed for a full period | 70.9% |
| Concordance index | 0.728 |
| Mean decile calibration gap | 2.8% |

## 5. An edge case from the blueprint

**Payer changes process.** historic turnaround no longer applies. Planned response: Change-point test and a switch to a recent window. Write the test that replays this case through your pipeline before you tune anything.

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
| `subjects` | 7690 |
| `train_subjects` | 4998 |
| `test_subjects` | 2692 |
| `event_share` | 0.61222 |
| `censored_share` | 0.38778 |
| `at_month` | 12 |
| `km_event_rate` | 0.50477 |
| `naive_drop_censored_event_rate` | 0.70914 |
| `naive_bias_vs_km` | 0.20436 |
| `count_all_rows_event_rate` | 0.42385 |
| `count_all_rows_bias_vs_km` | -0.080926 |
| `discrete_time_mean_predicted_risk` | 0.51501 |
| `c_index` | 0.72802 |
| `decile_calibration_mean_abs_gap` | 0.027976 |
| `decile_calibration_max_abs_gap` | 0.073329 |

</details>
