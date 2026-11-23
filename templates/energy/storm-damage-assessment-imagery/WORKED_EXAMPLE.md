# Storm Damage Assessment from Imagery: worked example

> Run on synthetic data with `survival` engine, seed 29929, knobs {"n": 9620, "dropout": 0.273}, in 0.3 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Assess damage to poles, lines and substations after storms from aerial, drone and satellite images so crews and materials are sent to the right places quickly.

**Constraints that shape the design.** Damage counts by area within 12 hours of imagery; Safety hazards such as downed lines flagged for immediate human review; Crew verifies before work

**Label in this use case.** For "Storm Damage Assessment from Imagery": Assess damage to poles, lines and substations after storms from aerial, drone and satellite images so crews and materials are sent to the right places quickly. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using damage counts as priority.

## 2. Choose the signals

Your strongest signal is **Damage class scores** (model scores for poles, wires and equipment). Its rule: Calibrated. In the starter, the closest executable idea is **risk factor (x0)**: raises the hazard. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

37% of subjects are censored: recent cohorts have simply not been observed long enough. Counting them as non-events gives 44.1% by month 12; dropping the incomplete ones gives 71.1%; the Kaplan-Meier estimate is 51.6%.

## 4. Baseline against the stronger design

A discrete-time hazard model trained on earlier cohorts ranks later cohorts with a concordance index of 0.718 and predicts a mean 52.4% risk, within 2.5% of observed by decile.

| Result | Value |
|---|---|
| Event rate by month 12 (Kaplan-Meier) | 51.6% |
| Counting censored as non-events | 44.1% |
| Dropping subjects not yet observed for a full period | 71.1% |
| Concordance index | 0.718 |
| Mean decile calibration gap | 2.5% |

## 5. An edge case from the blueprint

**Cloud cover.** satellite images are blocked. Planned response: Drone and aircraft fallbacks. Write the test that replays this case through your pipeline before you tune anything.

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
| `event_share` | 0.62983 |
| `censored_share` | 0.37017 |
| `at_month` | 12 |
| `km_event_rate` | 0.51646 |
| `naive_drop_censored_event_rate` | 0.711 |
| `naive_bias_vs_km` | 0.19455 |
| `count_all_rows_event_rate` | 0.44134 |
| `count_all_rows_bias_vs_km` | -0.075113 |
| `discrete_time_mean_predicted_risk` | 0.52393 |
| `c_index` | 0.71821 |
| `decile_calibration_mean_abs_gap` | 0.025139 |
| `decile_calibration_max_abs_gap` | 0.043102 |

</details>
