# Clinical Communication Delay & Escalation Risk Prediction: worked example

> Run on synthetic data with `survival` engine, seed 7366, knobs {"n": 6770, "dropout": 0.196}, in 0.6 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict which messages are likely to miss acknowledgement or response service levels or stay unresolved, and give the escalation owner a time-to-response estimate and a trigger, while urgent deterministic escalation always overrides the model.

**Constraints that shape the design.** Urgent messages follow deterministic escalation timers and the model can only add earlier escalation; The operational escalation owner manages alerts and no message is withheld or reordered by the score; Alerts are rate limited per owner and show their reasons

**Label in this use case.** For "Clinical Communication Delay & Escalation Risk Prediction": Predict which messages are likely to miss acknowledgement or response service levels or stay unresolved, and give the escalation owner a time-to-response estimate and a trigger, while urgent deterministic escalation always overrides the model. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Letting the score replace urgent timers.

## 2. Choose the signals

Your strongest signal is **Queue depth and arrival rate** (open messages and recent arrivals in the target queue). Its rule: Event stream. In the starter, the closest executable idea is **risk factor (x0)**: raises the hazard. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

36% of subjects are censored: recent cohorts have simply not been observed long enough. Counting them as non-events gives 44.2% by month 12; dropping the incomplete ones gives 69.8%; the Kaplan-Meier estimate is 52.0%.

## 4. Baseline against the stronger design

A discrete-time hazard model trained on earlier cohorts ranks later cohorts with a concordance index of 0.707 and predicts a mean 52.1% risk, within 3.1% of observed by decile.

| Result | Value |
|---|---|
| Event rate by month 12 (Kaplan-Meier) | 52.0% |
| Counting censored as non-events | 44.2% |
| Dropping subjects not yet observed for a full period | 69.8% |
| Concordance index | 0.707 |
| Mean decile calibration gap | 3.1% |

## 5. An edge case from the blueprint

**Shift change.** availability drops suddenly. Planned response: Roster events in the features. Write the test that replays this case through your pipeline before you tune anything.

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
| `subjects` | 6770 |
| `train_subjects` | 4400 |
| `test_subjects` | 2370 |
| `event_share` | 0.63722 |
| `censored_share` | 0.36278 |
| `at_month` | 12 |
| `km_event_rate` | 0.51962 |
| `naive_drop_censored_event_rate` | 0.6982 |
| `naive_bias_vs_km` | 0.17858 |
| `count_all_rows_event_rate` | 0.44219 |
| `count_all_rows_bias_vs_km` | -0.077431 |
| `discrete_time_mean_predicted_risk` | 0.52115 |
| `c_index` | 0.70673 |
| `decile_calibration_mean_abs_gap` | 0.030873 |
| `decile_calibration_max_abs_gap` | 0.050124 |

</details>
