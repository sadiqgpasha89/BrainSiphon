# Healthcare Workforce Burnout & Attrition Early Warning: worked example

> Run on synthetic data with `survival` engine, seed 17158, knobs {"n": 6140, "dropout": 0.235}, in 0.6 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Identify aggregate working conditions associated with elevated burnout, absence or voluntary attrition risk at team and unit level so leaders can improve those conditions, never to score or manage individuals.

**Constraints that shape the design.** Analysis is at team or unit level with a minimum group size and small-cell suppression; No individual risk score is computed or stored; No inference of mental or physical health and no use of protected or sensitive traits

**Label in this use case.** For "Healthcare Workforce Burnout & Attrition Early Warning": Identify aggregate working conditions associated with elevated burnout, absence or voluntary attrition risk at team and unit level so leaders can improve those conditions, never to score or manage individuals. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating on a random split of employees rather than by period.

## 2. Choose the signals

Your strongest signal is **Schedule churn** (share of shifts changed within 72 hours at unit level). Its rule: Use schedule snapshots prior to the outcome window. In the starter, the closest executable idea is **risk factor (x0)**: raises the hazard. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

36% of subjects are censored: recent cohorts have simply not been observed long enough. Counting them as non-events gives 45.5% by month 12; dropping the incomplete ones gives 72.4%; the Kaplan-Meier estimate is 54.2%.

## 4. Baseline against the stronger design

A discrete-time hazard model trained on earlier cohorts ranks later cohorts with a concordance index of 0.719 and predicts a mean 53.0% risk, within 2.9% of observed by decile.

| Result | Value |
|---|---|
| Event rate by month 12 (Kaplan-Meier) | 54.2% |
| Counting censored as non-events | 45.5% |
| Dropping subjects not yet observed for a full period | 72.4% |
| Concordance index | 0.719 |
| Mean decile calibration gap | 2.9% |

## 5. An edge case from the blueprint

**A team shrinks below the minimum size.** an aggregate could identify a person. Planned response: Automatic suppression and merge with a sibling team. Write the test that replays this case through your pipeline before you tune anything.

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
| `subjects` | 6140 |
| `train_subjects` | 3991 |
| `test_subjects` | 2149 |
| `event_share` | 0.64397 |
| `censored_share` | 0.35603 |
| `at_month` | 12 |
| `km_event_rate` | 0.5423 |
| `naive_drop_censored_event_rate` | 0.72391 |
| `naive_bias_vs_km` | 0.18161 |
| `count_all_rows_event_rate` | 0.4551 |
| `count_all_rows_bias_vs_km` | -0.087203 |
| `discrete_time_mean_predicted_risk` | 0.52981 |
| `c_index` | 0.71879 |
| `decile_calibration_mean_abs_gap` | 0.02909 |
| `decile_calibration_max_abs_gap` | 0.073338 |

</details>
