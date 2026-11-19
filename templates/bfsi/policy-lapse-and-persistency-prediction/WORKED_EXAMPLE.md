# Policy Lapse & Persistency Prediction: worked example

> Run on synthetic data with `survival` engine, seed 19137, knobs {"n": 8450, "dropout": 0.249}, in 0.1 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict which policies will lapse so retention teams and the actuary can plan interventions and reserves.

**Constraints that shape the design.** Retention offers within conduct rules; Monthly scoring; Explainable

**Label in this use case.** For "Policy Lapse & Persistency Prediction": Predict which policies will lapse so retention teams and the actuary can plan interventions and reserves. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Contacted customers differ.

## 2. Choose the signals

Your strongest signal is **Premium shock** (renewal premium change). Its rule: Known at renewal. In the starter, the closest executable idea is **risk factor (x0)**: raises the hazard. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

36% of subjects are censored: recent cohorts have simply not been observed long enough. Counting them as non-events gives 44.9% by month 12; dropping the incomplete ones gives 69.2%; the Kaplan-Meier estimate is 52.2%.

## 4. Baseline against the stronger design

A discrete-time hazard model trained on earlier cohorts ranks later cohorts with a concordance index of 0.707 and predicts a mean 51.8% risk, within 2.3% of observed by decile.

| Result | Value |
|---|---|
| Event rate by month 12 (Kaplan-Meier) | 52.2% |
| Counting censored as non-events | 44.9% |
| Dropping subjects not yet observed for a full period | 69.2% |
| Concordance index | 0.707 |
| Mean decile calibration gap | 2.3% |

## 5. An edge case from the blueprint

**Regulation limits offers.** Some retention offers are not allowed for certain customers. Planned response: Apply offer eligibility rules before ranking so the list contains only lawful offers. Write the test that replays this case through your pipeline before you tune anything.

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
| `subjects` | 8450 |
| `train_subjects` | 5492 |
| `test_subjects` | 2958 |
| `event_share` | 0.63775 |
| `censored_share` | 0.36225 |
| `at_month` | 12 |
| `km_event_rate` | 0.52242 |
| `naive_drop_censored_event_rate` | 0.69187 |
| `naive_bias_vs_km` | 0.16944 |
| `count_all_rows_event_rate` | 0.44861 |
| `count_all_rows_bias_vs_km` | -0.07381 |
| `discrete_time_mean_predicted_risk` | 0.5183 |
| `c_index` | 0.70652 |
| `decile_calibration_mean_abs_gap` | 0.023094 |
| `decile_calibration_max_abs_gap` | 0.041436 |

</details>
