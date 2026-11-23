# Site Hazard and PPE Detection: worked example

> Run on synthetic data with `survival` engine, seed 28388, knobs {"n": 7300, "dropout": 0.124}, in 0.2 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect scene-level hazards such as missing edge protection, unguarded openings, blocked exits and exclusion zone breaches from site cameras and alert the safety manager, without identifying or scoring individual workers.

**Constraints that shape the design.** No face recognition and no individual identification; Alerts by zone to safety managers; Imagery retention under 30 days

**Label in this use case.** For "Site Hazard and PPE Detection": Detect scene-level hazards such as missing edge protection, unguarded openings, blocked exits and exclusion zone breaches from site cameras and alert the safety manager, without identifying or scoring individual workers. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Individual identification.

## 2. Choose the signals

Your strongest signal is **Hazard condition classification** (open edge, blocked exit or zone breach). Its rule: From a vision model. In the starter, the closest executable idea is **risk factor (x0)**: raises the hazard. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

34% of subjects are censored: recent cohorts have simply not been observed long enough. Counting them as non-events gives 44.3% by month 12; dropping the incomplete ones gives 68.3%; the Kaplan-Meier estimate is 50.9%.

## 4. Baseline against the stronger design

A discrete-time hazard model trained on earlier cohorts ranks later cohorts with a concordance index of 0.731 and predicts a mean 52.6% risk, within 2.1% of observed by decile.

| Result | Value |
|---|---|
| Event rate by month 12 (Kaplan-Meier) | 50.9% |
| Counting censored as non-events | 44.3% |
| Dropping subjects not yet observed for a full period | 68.3% |
| Concordance index | 0.731 |
| Mean decile calibration gap | 2.1% |

## 5. An edge case from the blueprint

**Night work.** low light lowers accuracy. Planned response: Infrared or lighting requirements. Write the test that replays this case through your pipeline before you tune anything.

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
| `subjects` | 7300 |
| `train_subjects` | 4745 |
| `test_subjects` | 2555 |
| `event_share` | 0.65712 |
| `censored_share` | 0.34288 |
| `at_month` | 12 |
| `km_event_rate` | 0.5093 |
| `naive_drop_censored_event_rate` | 0.68316 |
| `naive_bias_vs_km` | 0.17386 |
| `count_all_rows_event_rate` | 0.44305 |
| `count_all_rows_bias_vs_km` | -0.066249 |
| `discrete_time_mean_predicted_risk` | 0.52646 |
| `c_index` | 0.73105 |
| `decile_calibration_mean_abs_gap` | 0.021167 |
| `decile_calibration_max_abs_gap` | 0.058693 |

</details>
