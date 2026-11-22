# Healthcare Compliance Control Effectiveness Prediction: worked example

> Run on synthetic data with `survival` engine, seed 18394, knobs {"n": 8420, "dropout": 0.183}, in 0.7 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Identify controls with a rising likelihood of failure using overdue tests, exceptions, incidents and evidence quality, and give risk owners a ranked queue with the contributing signals and a recommended next test.

**Constraints that shape the design.** Compliance and risk owners validate ratings and remediation and the score never changes a control rating itself; Deterministic rules for overdue tests and open exceptions run first; Every score shows the contributing signals

**Label in this use case.** For "Healthcare Compliance Control Effectiveness Prediction": Identify controls with a rising likelihood of failure using overdue tests, exceptions, incidents and evidence quality, and give risk owners a ranked queue with the contributing signals and a recommended next test. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Predicting failures that rules already show.

## 2. Choose the signals

Your strongest signal is **Days overdue for testing** (days past the planned test date). Its rule: Test schedule. In the starter, the closest executable idea is **risk factor (x0)**: raises the hazard. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

36% of subjects are censored: recent cohorts have simply not been observed long enough. Counting them as non-events gives 44.5% by month 12; dropping the incomplete ones gives 68.4%; the Kaplan-Meier estimate is 51.3%.

## 4. Baseline against the stronger design

A discrete-time hazard model trained on earlier cohorts ranks later cohorts with a concordance index of 0.723 and predicts a mean 51.6% risk, within 2.1% of observed by decile.

| Result | Value |
|---|---|
| Event rate by month 12 (Kaplan-Meier) | 51.3% |
| Counting censored as non-events | 44.5% |
| Dropping subjects not yet observed for a full period | 68.4% |
| Concordance index | 0.723 |
| Mean decile calibration gap | 2.1% |

## 5. An edge case from the blueprint

**New control.** no history. Planned response: Category prior and a low-confidence flag. Write the test that replays this case through your pipeline before you tune anything.

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
| `subjects` | 8420 |
| `train_subjects` | 5473 |
| `test_subjects` | 2947 |
| `event_share` | 0.64192 |
| `censored_share` | 0.35808 |
| `at_month` | 12 |
| `km_event_rate` | 0.51344 |
| `naive_drop_censored_event_rate` | 0.68369 |
| `naive_bias_vs_km` | 0.17025 |
| `count_all_rows_event_rate` | 0.4452 |
| `count_all_rows_bias_vs_km` | -0.068241 |
| `discrete_time_mean_predicted_risk` | 0.51595 |
| `c_index` | 0.72315 |
| `decile_calibration_mean_abs_gap` | 0.020989 |
| `decile_calibration_max_abs_gap` | 0.036493 |

</details>
