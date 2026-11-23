# Road Weather Hazard Alerting: worked example

> Run on synthetic data with `survival` engine, seed 90474, knobs {"n": 7680, "dropout": 0.138}, in 0.2 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast ice, flooding and low visibility on road segments from sensors and weather models and alert maintenance teams and drivers in time to treat or warn.

**Constraints that shape the design.** Segment forecasts for the next 6 hours; Alerts to winter service within 10 minutes of threshold; Message signs set by named operators

**Label in this use case.** For "Road Weather Hazard Alerting": Forecast ice, flooding and low visibility on road segments from sensors and weather models and alert maintenance teams and drivers in time to treat or warn. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Air temperature as the only input.

## 2. Choose the signals

Your strongest signal is **Pavement temperature forecast** (predicted surface temperature). Its rule: From models. In the starter, the closest executable idea is **risk factor (x0)**: raises the hazard. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

35% of subjects are censored: recent cohorts have simply not been observed long enough. Counting them as non-events gives 46.3% by month 12; dropping the incomplete ones gives 70.1%; the Kaplan-Meier estimate is 53.2%.

## 4. Baseline against the stronger design

A discrete-time hazard model trained on earlier cohorts ranks later cohorts with a concordance index of 0.721 and predicts a mean 52.6% risk, within 2.6% of observed by decile.

| Result | Value |
|---|---|
| Event rate by month 12 (Kaplan-Meier) | 53.2% |
| Counting censored as non-events | 46.3% |
| Dropping subjects not yet observed for a full period | 70.1% |
| Concordance index | 0.721 |
| Mean decile calibration gap | 2.6% |

## 5. An edge case from the blueprint

**Sensor outage.** a station reports nothing. Planned response: Neighbour inference and a flag. Write the test that replays this case through your pipeline before you tune anything.

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
| `subjects` | 7680 |
| `train_subjects` | 4992 |
| `test_subjects` | 2688 |
| `event_share` | 0.65182 |
| `censored_share` | 0.34818 |
| `at_month` | 12 |
| `km_event_rate` | 0.53161 |
| `naive_drop_censored_event_rate` | 0.70141 |
| `naive_bias_vs_km` | 0.1698 |
| `count_all_rows_event_rate` | 0.46317 |
| `count_all_rows_bias_vs_km` | -0.068442 |
| `discrete_time_mean_predicted_risk` | 0.5259 |
| `c_index` | 0.72053 |
| `decile_calibration_mean_abs_gap` | 0.025769 |
| `decile_calibration_max_abs_gap` | 0.074158 |

</details>
