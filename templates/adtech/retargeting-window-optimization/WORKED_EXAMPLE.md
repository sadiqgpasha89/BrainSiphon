# Retargeting Window & Churn Optimisation: worked example

> Run on synthetic data with `survival` engine, seed 86622, knobs {"n": 6600, "dropout": 0.182}, in 0.1 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Decide whether, when and how long to retarget each visitor to maximise incremental conversions and avoid chasing converted users.

**Constraints that shape the design.** Suppress after conversion; Frequency limits; Consent

**Label in this use case.** For "Retargeting Window & Churn Optimisation": Decide whether, when and how long to retarget each visitor to maximise incremental conversions and avoid chasing converted users. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Observational lift inflated by selection.

## 2. Choose the signals

Your strongest signal is **Time since last visit** (hours since visit). Its rule: Clock. In the starter, the closest executable idea is **risk factor (x0)**: raises the hazard. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

35% of subjects are censored: recent cohorts have simply not been observed long enough. Counting them as non-events gives 45.6% by month 12; dropping the incomplete ones gives 71.5%; the Kaplan-Meier estimate is 53.9%.

## 4. Baseline against the stronger design

A discrete-time hazard model trained on earlier cohorts ranks later cohorts with a concordance index of 0.724 and predicts a mean 53.3% risk, within 2.0% of observed by decile.

| Result | Value |
|---|---|
| Event rate by month 12 (Kaplan-Meier) | 53.9% |
| Counting censored as non-events | 45.6% |
| Dropping subjects not yet observed for a full period | 71.5% |
| Concordance index | 0.724 |
| Mean decile calibration gap | 2.0% |

## 5. An edge case from the blueprint

**Conversion postbacks delayed.** users converted yesterday still targeted. Planned response: Faster conversion signals and conservative decay. Write the test that replays this case through your pipeline before you tune anything.

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
| `subjects` | 6600 |
| `train_subjects` | 4290 |
| `test_subjects` | 2310 |
| `event_share` | 0.64879 |
| `censored_share` | 0.35121 |
| `at_month` | 12 |
| `km_event_rate` | 0.53854 |
| `naive_drop_censored_event_rate` | 0.71487 |
| `naive_bias_vs_km` | 0.17633 |
| `count_all_rows_event_rate` | 0.45584 |
| `count_all_rows_bias_vs_km` | -0.082697 |
| `discrete_time_mean_predicted_risk` | 0.53297 |
| `c_index` | 0.7238 |
| `decile_calibration_mean_abs_gap` | 0.020323 |
| `decile_calibration_max_abs_gap` | 0.039909 |

</details>
