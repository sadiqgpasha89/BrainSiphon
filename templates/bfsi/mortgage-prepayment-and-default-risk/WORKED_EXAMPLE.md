# Mortgage Prepayment & Default Risk Modelling: worked example

> Run on synthetic data with `survival` engine, seed 78696, knobs {"n": 6360, "dropout": 0.236}, in 0.1 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast monthly prepayment and default for each mortgage so pricing, hedging, provisioning and servicing capacity use the right cash flows.

**Constraints that shape the design.** Competing risks, prepayment versus default, modelled jointly; Rate-path scenarios from the treasury curve engine; Monthly run under 3 hours for 4M loans

**Label in this use case.** For "Mortgage Prepayment & Default Risk Modelling": Forecast monthly prepayment and default for each mortgage so pricing, hedging, provisioning and servicing capacity use the right cash flows. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Random split leaks vintages across train and test.

## 2. Choose the signals

Your strongest signal is **Refinance incentive** (current coupon minus prevailing offer rate for the borrower's LTV and score band). Its rule: Market rate must be as at the month, not today. In the starter, the closest executable idea is **risk factor (x0)**: raises the hazard. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

38% of subjects are censored: recent cohorts have simply not been observed long enough. Counting them as non-events gives 42.4% by month 12; dropping the incomplete ones gives 67.8%; the Kaplan-Meier estimate is 50.2%.

## 4. Baseline against the stronger design

A discrete-time hazard model trained on earlier cohorts ranks later cohorts with a concordance index of 0.734 and predicts a mean 51.3% risk, within 2.5% of observed by decile.

| Result | Value |
|---|---|
| Event rate by month 12 (Kaplan-Meier) | 50.2% |
| Counting censored as non-events | 42.4% |
| Dropping subjects not yet observed for a full period | 67.8% |
| Concordance index | 0.734 |
| Mean decile calibration gap | 2.5% |

## 5. An edge case from the blueprint

**Rate regime never seen in training.** model extrapolates refinancing behaviour badly. Planned response: Scenario bands, monotone constraints on incentive and an overlay process approved by risk. Write the test that replays this case through your pipeline before you tune anything.

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
| `subjects` | 6360 |
| `train_subjects` | 4134 |
| `test_subjects` | 2226 |
| `event_share` | 0.62123 |
| `censored_share` | 0.37877 |
| `at_month` | 12 |
| `km_event_rate` | 0.50187 |
| `naive_drop_censored_event_rate` | 0.67842 |
| `naive_bias_vs_km` | 0.17654 |
| `count_all_rows_event_rate` | 0.42363 |
| `count_all_rows_bias_vs_km` | -0.078243 |
| `discrete_time_mean_predicted_risk` | 0.51296 |
| `c_index` | 0.73383 |
| `decile_calibration_mean_abs_gap` | 0.024719 |
| `decile_calibration_max_abs_gap` | 0.070711 |

</details>
