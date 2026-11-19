# Customer Repurchase & Churn Prediction: worked example

> Run on synthetic data with `survival` engine, seed 56712, knobs {"n": 9200, "dropout": 0.211}, in 0.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict who will order again in the next 30/60/90 days to time retention actions and acquisition value estimates.

**Constraints that shape the design.** Non-contractual setting; Purchase cycles differ by category; Weekly scoring

**Label in this use case.** For "Customer Repurchase & Churn Prediction": Predict who will order again in the next 30/60/90 days to time retention actions and acquisition value estimates. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Random split mixing customer periods.

## 2. Choose the signals

Your strongest signal is **Recency over expected interval** (days since last order divided by personal median interval). Its rule: Median from prior orders. In the starter, the closest executable idea is **risk factor (x0)**: raises the hazard. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

36% of subjects are censored: recent cohorts have simply not been observed long enough. Counting them as non-events gives 44.5% by month 12; dropping the incomplete ones gives 70.1%; the Kaplan-Meier estimate is 51.8%.

## 4. Baseline against the stronger design

A discrete-time hazard model trained on earlier cohorts ranks later cohorts with a concordance index of 0.725 and predicts a mean 51.9% risk, within 1.8% of observed by decile.

| Result | Value |
|---|---|
| Event rate by month 12 (Kaplan-Meier) | 51.8% |
| Counting censored as non-events | 44.5% |
| Dropping subjects not yet observed for a full period | 70.1% |
| Concordance index | 0.725 |
| Mean decile calibration gap | 1.8% |

## 5. An edge case from the blueprint

**Seasonal buyers (gifting).** wrongly labelled churned. Planned response: Seasonality-aware expected interval. Write the test that replays this case through your pipeline before you tune anything.

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
| `subjects` | 9200 |
| `train_subjects` | 5980 |
| `test_subjects` | 3220 |
| `event_share` | 0.6412 |
| `censored_share` | 0.3588 |
| `at_month` | 12 |
| `km_event_rate` | 0.51761 |
| `naive_drop_censored_event_rate` | 0.70142 |
| `naive_bias_vs_km` | 0.18381 |
| `count_all_rows_event_rate` | 0.44503 |
| `count_all_rows_bias_vs_km` | -0.072577 |
| `discrete_time_mean_predicted_risk` | 0.51908 |
| `c_index` | 0.72497 |
| `decile_calibration_mean_abs_gap` | 0.017852 |
| `decile_calibration_max_abs_gap` | 0.040631 |

</details>
