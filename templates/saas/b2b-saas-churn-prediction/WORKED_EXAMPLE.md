# B2B SaaS Churn Prediction: worked example

> Run on synthetic data with `survival` engine, seed 1357, knobs {"n": 6580, "dropout": 0.214}, in 0.1 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict account-level churn and contraction 90 days ahead and recommend the intervention that actually retains revenue.

**Constraints that shape the design.** Contract renewal cycles; Few accounts relative to users; Explainable to CSMs

**Label in this use case.** For "B2B SaaS Churn Prediction": Predict account-level churn and contraction 90 days ahead and recommend the intervention that actually retains revenue. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Features computed after the renewal conversation started.

## 2. Choose the signals

Your strongest signal is **Admin and champion activity** (logins and configuration changes by admins). Its rule: Role mapping. In the starter, the closest executable idea is **risk factor (x0)**: raises the hazard. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

36% of subjects are censored: recent cohorts have simply not been observed long enough. Counting them as non-events gives 43.9% by month 12; dropping the incomplete ones gives 69.2%; the Kaplan-Meier estimate is 51.1%.

## 4. Baseline against the stronger design

A discrete-time hazard model trained on earlier cohorts ranks later cohorts with a concordance index of 0.722 and predicts a mean 52.8% risk, within 2.8% of observed by decile.

| Result | Value |
|---|---|
| Event rate by month 12 (Kaplan-Meier) | 51.1% |
| Counting censored as non-events | 43.9% |
| Dropping subjects not yet observed for a full period | 69.2% |
| Concordance index | 0.722 |
| Mean decile calibration gap | 2.8% |

## 5. An edge case from the blueprint

**Champion leaves the customer.** usage looks fine until the renewal blows up. Planned response: Contact-graph monitoring and champion-change features. Write the test that replays this case through your pipeline before you tune anything.

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
| `subjects` | 6580 |
| `train_subjects` | 4277 |
| `test_subjects` | 2303 |
| `event_share` | 0.64073 |
| `censored_share` | 0.35927 |
| `at_month` | 12 |
| `km_event_rate` | 0.51141 |
| `naive_drop_censored_event_rate` | 0.6922 |
| `naive_bias_vs_km` | 0.18079 |
| `count_all_rows_event_rate` | 0.43943 |
| `count_all_rows_bias_vs_km` | -0.071988 |
| `discrete_time_mean_predicted_risk` | 0.52756 |
| `c_index` | 0.72222 |
| `decile_calibration_mean_abs_gap` | 0.027569 |
| `decile_calibration_max_abs_gap` | 0.059803 |

</details>
