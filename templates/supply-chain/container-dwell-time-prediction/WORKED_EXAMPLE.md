# Container Dwell-Time Prediction: worked example

> Run on synthetic data with `survival` engine, seed 76239, knobs {"n": 6310, "dropout": 0.294}, in 0.1 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict how long import containers stay in port to plan yard capacity, trucking and demurrage exposure.

**Constraints that shape the design.** Censoring for still-in-yard containers; Daily refresh; Interpretable for terminal planners

**Label in this use case.** For "Container Dwell-Time Prediction": Predict how long import containers stay in port to plan yard capacity, trucking and demurrage exposure. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on completed containers only.

## 2. Choose the signals

Your strongest signal is **Customs status stage** (cleared, hold, pending). Its rule: Event times. In the starter, the closest executable idea is **risk factor (x0)**: raises the hazard. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

38% of subjects are censored: recent cohorts have simply not been observed long enough. Counting them as non-events gives 43.5% by month 12; dropping the incomplete ones gives 68.7%; the Kaplan-Meier estimate is 51.1%.

## 4. Baseline against the stronger design

A discrete-time hazard model trained on earlier cohorts ranks later cohorts with a concordance index of 0.716 and predicts a mean 51.5% risk, within 2.7% of observed by decile.

| Result | Value |
|---|---|
| Event rate by month 12 (Kaplan-Meier) | 51.1% |
| Counting censored as non-events | 43.5% |
| Dropping subjects not yet observed for a full period | 68.7% |
| Concordance index | 0.716 |
| Mean decile calibration gap | 2.7% |

## 5. An edge case from the blueprint

**Customs system outage.** no clearance events. Planned response: Outage flag and widened predictions. Write the test that replays this case through your pipeline before you tune anything.

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
| `subjects` | 6310 |
| `train_subjects` | 4101 |
| `test_subjects` | 2209 |
| `event_share` | 0.62219 |
| `censored_share` | 0.37781 |
| `at_month` | 12 |
| `km_event_rate` | 0.51063 |
| `naive_drop_censored_event_rate` | 0.6867 |
| `naive_bias_vs_km` | 0.17606 |
| `count_all_rows_event_rate` | 0.43459 |
| `count_all_rows_bias_vs_km` | -0.076048 |
| `discrete_time_mean_predicted_risk` | 0.51462 |
| `c_index` | 0.71602 |
| `decile_calibration_mean_abs_gap` | 0.027209 |
| `decile_calibration_max_abs_gap` | 0.073229 |

</details>
