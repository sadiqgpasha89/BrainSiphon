# Corrective Action & CAPA Effectiveness Prediction: worked example

> Run on synthetic data with `survival` engine, seed 52232, knobs {"n": 9040, "dropout": 0.275}, in 1.0 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Estimate recurrence risk and monitor whether corrective and preventive actions are implemented and effective, flagging overdue or weak actions and evidence gaps for the quality committee.

**Constraints that shape the design.** The safety or quality committee approves every CAPA closure; Workflow rules handle overdue and missing-evidence conditions and the model only estimates recurrence risk; No causal claim that an action worked without a suitable design

**Label in this use case.** For "Corrective Action & CAPA Effectiveness Prediction": Estimate recurrence risk and monitor whether corrective and preventive actions are implemented and effective, flagging overdue or weak actions and evidence gaps for the quality committee. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Treating closure as effectiveness.

## 2. Choose the signals

Your strongest signal is **Action strength** (classification on an action-strength hierarchy). Its rule: From the plan. In the starter, the closest executable idea is **risk factor (x0)**: raises the hazard. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

37% of subjects are censored: recent cohorts have simply not been observed long enough. Counting them as non-events gives 45.8% by month 12; dropping the incomplete ones gives 71.8%; the Kaplan-Meier estimate is 53.7%.

## 4. Baseline against the stronger design

A discrete-time hazard model trained on earlier cohorts ranks later cohorts with a concordance index of 0.717 and predicts a mean 52.4% risk, within 1.7% of observed by decile.

| Result | Value |
|---|---|
| Event rate by month 12 (Kaplan-Meier) | 53.7% |
| Counting censored as non-events | 45.8% |
| Dropping subjects not yet observed for a full period | 71.8% |
| Concordance index | 0.717 |
| Mean decile calibration gap | 1.7% |

## 5. An edge case from the blueprint

**Concurrent changes.** recurrence falls for another reason. Planned response: Flag overlapping initiatives and avoid effect claims. Write the test that replays this case through your pipeline before you tune anything.

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
| `subjects` | 9040 |
| `train_subjects` | 5876 |
| `test_subjects` | 3164 |
| `event_share` | 0.63131 |
| `censored_share` | 0.36869 |
| `at_month` | 12 |
| `km_event_rate` | 0.53657 |
| `naive_drop_censored_event_rate` | 0.71782 |
| `naive_bias_vs_km` | 0.18125 |
| `count_all_rows_event_rate` | 0.45828 |
| `count_all_rows_bias_vs_km` | -0.07829 |
| `discrete_time_mean_predicted_risk` | 0.52403 |
| `c_index` | 0.71688 |
| `decile_calibration_mean_abs_gap` | 0.017407 |
| `decile_calibration_max_abs_gap` | 0.064617 |

</details>
