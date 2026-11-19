# Student Dropout & Attrition Early Warning: worked example

> Run on synthetic data with `survival` engine, seed 1003, knobs {"n": 7790, "dropout": 0.139}, in 0.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Identify learners at risk of dropping out weeks ahead and trigger supportive interventions that actually help.

**Constraints that shape the design.** Equity (avoid labelling disadvantaged students); Explainable to advisors; Intervention capacity

**Label in this use case.** For "Student Dropout & Attrition Early Warning": Identify learners at risk of dropping out weeks ahead and trigger supportive interventions that actually help. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Interventions confound labels.

## 2. Choose the signals

Your strongest signal is **Engagement decay** (trend in logins and submissions). Its rule: Window. In the starter, the closest executable idea is **risk factor (x0)**: raises the hazard. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

35% of subjects are censored: recent cohorts have simply not been observed long enough. Counting them as non-events gives 44.0% by month 12; dropping the incomplete ones gives 69.4%; the Kaplan-Meier estimate is 51.1%.

## 4. Baseline against the stronger design

A discrete-time hazard model trained on earlier cohorts ranks later cohorts with a concordance index of 0.726 and predicts a mean 51.8% risk, within 2.6% of observed by decile.

| Result | Value |
|---|---|
| Event rate by month 12 (Kaplan-Meier) | 51.1% |
| Counting censored as non-events | 44.0% |
| Dropping subjects not yet observed for a full period | 69.4% |
| Concordance index | 0.726 |
| Mean decile calibration gap | 2.6% |

## 5. An edge case from the blueprint

**Term break creates apparent disengagement.** holiday breaks look like disengagement and trigger a wave of false warnings. Planned response: Calendar-aware features. Write the test that replays this case through your pipeline before you tune anything.

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
| `subjects` | 7790 |
| `train_subjects` | 5063 |
| `test_subjects` | 2727 |
| `event_share` | 0.64878 |
| `censored_share` | 0.35122 |
| `at_month` | 12 |
| `km_event_rate` | 0.51135 |
| `naive_drop_censored_event_rate` | 0.69422 |
| `naive_bias_vs_km` | 0.18287 |
| `count_all_rows_event_rate` | 0.44041 |
| `count_all_rows_bias_vs_km` | -0.070935 |
| `discrete_time_mean_predicted_risk` | 0.51761 |
| `c_index` | 0.72591 |
| `decile_calibration_mean_abs_gap` | 0.025519 |
| `decile_calibration_max_abs_gap` | 0.058213 |

</details>
