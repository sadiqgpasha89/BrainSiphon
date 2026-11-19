# Fleet Predictive Maintenance: worked example

> Run on synthetic data with `survival` engine, seed 86980, knobs {"n": 9620, "dropout": 0.171}, in 0.3 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict component failures from telematics and service history to schedule maintenance before breakdowns.

**Constraints that shape the design.** Downtime costs; Telematics gaps; Explainable component-level alerts

**Label in this use case.** For "Fleet Predictive Maintenance": Predict component failures from telematics and service history to schedule maintenance before breakdowns. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Treating replaced parts as non-failures.

## 2. Choose the signals

Your strongest signal is **Sensor degradation trend** (slope of vibration, temperature or voltage). Its rule: Sensor calibration. In the starter, the closest executable idea is **risk factor (x0)**: raises the hazard. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

36% of subjects are censored: recent cohorts have simply not been observed long enough. Counting them as non-events gives 44.2% by month 12; dropping the incomplete ones gives 69.2%; the Kaplan-Meier estimate is 51.5%.

## 4. Baseline against the stronger design

A discrete-time hazard model trained on earlier cohorts ranks later cohorts with a concordance index of 0.711 and predicts a mean 51.5% risk, within 1.9% of observed by decile.

| Result | Value |
|---|---|
| Event rate by month 12 (Kaplan-Meier) | 51.5% |
| Counting censored as non-events | 44.2% |
| Dropping subjects not yet observed for a full period | 69.2% |
| Concordance index | 0.711 |
| Mean decile calibration gap | 1.9% |

## 5. An edge case from the blueprint

**Sensor firmware update changes scale.** a firmware update rescales sensor values so features shift and predictions degrade. Planned response: Firmware-aware normalisation. Write the test that replays this case through your pipeline before you tune anything.

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
| `subjects` | 9620 |
| `train_subjects` | 6253 |
| `test_subjects` | 3367 |
| `event_share` | 0.64283 |
| `censored_share` | 0.35717 |
| `at_month` | 12 |
| `km_event_rate` | 0.51486 |
| `naive_drop_censored_event_rate` | 0.69242 |
| `naive_bias_vs_km` | 0.17756 |
| `count_all_rows_event_rate` | 0.44194 |
| `count_all_rows_bias_vs_km` | -0.072921 |
| `discrete_time_mean_predicted_risk` | 0.51465 |
| `c_index` | 0.71074 |
| `decile_calibration_mean_abs_gap` | 0.019038 |
| `decile_calibration_max_abs_gap` | 0.050393 |

</details>
