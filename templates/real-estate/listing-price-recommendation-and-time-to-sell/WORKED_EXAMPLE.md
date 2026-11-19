# Listing Price Recommendation & Time-to-Sell: worked example

> Run on synthetic data with `survival` engine, seed 74804, knobs {"n": 7990, "dropout": 0.211}, in 0.1 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Recommend a listing price and predict the days to sell at different prices so sellers and agents can trade price against time.

**Constraints that shape the design.** Recommendations are advice not valuations; Price-time curves shown with intervals; Sellers decide

**Label in this use case.** For "Listing Price Recommendation & Time-to-Sell": Recommend a listing price and predict the days to sell at different prices so sellers and agents can trade price against time. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Withdrawn listings dropped.

## 2. Choose the signals

Your strongest signal is **Price to value ratio** (listing price divided by AVM value). Its rule: AVM error. In the starter, the closest executable idea is **risk factor (x0)**: raises the hazard. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

36% of subjects are censored: recent cohorts have simply not been observed long enough. Counting them as non-events gives 45.4% by month 12; dropping the incomplete ones gives 70.8%; the Kaplan-Meier estimate is 53.3%.

## 4. Baseline against the stronger design

A discrete-time hazard model trained on earlier cohorts ranks later cohorts with a concordance index of 0.727 and predicts a mean 52.9% risk, within 2.3% of observed by decile.

| Result | Value |
|---|---|
| Event rate by month 12 (Kaplan-Meier) | 53.3% |
| Counting censored as non-events | 45.4% |
| Dropping subjects not yet observed for a full period | 70.8% |
| Concordance index | 0.727 |
| Mean decile calibration gap | 2.3% |

## 5. An edge case from the blueprint

**Bidding war.** Sale prices above list in a bidding war make the list price misleading. Planned response: Model the sale-to-list ratio and include market heat. Write the test that replays this case through your pipeline before you tune anything.

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
| `subjects` | 7990 |
| `train_subjects` | 5193 |
| `test_subjects` | 2797 |
| `event_share` | 0.63517 |
| `censored_share` | 0.36483 |
| `at_month` | 12 |
| `km_event_rate` | 0.5335 |
| `naive_drop_censored_event_rate` | 0.70815 |
| `naive_bias_vs_km` | 0.17465 |
| `count_all_rows_event_rate` | 0.4537 |
| `count_all_rows_bias_vs_km` | -0.079798 |
| `discrete_time_mean_predicted_risk` | 0.52857 |
| `c_index` | 0.72687 |
| `decile_calibration_mean_abs_gap` | 0.02339 |
| `decile_calibration_max_abs_gap` | 0.056347 |

</details>
