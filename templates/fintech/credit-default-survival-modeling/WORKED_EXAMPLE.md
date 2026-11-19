# Credit Default Survival Modeling: worked example

> Run on synthetic data with `survival` engine, seed 57114, knobs {"n": 6550, "dropout": 0.247}, in 0.1 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Estimate time-to-default curves per borrower to set provisions, pricing and limits under IFRS 9 / CECL.

**Constraints that shape the design.** Regulatory explainability and monotonic constraints; Monthly portfolio refresh in under 2 hours; Stable under macro regime change

**Label in this use case.** For "Credit Default Survival Modeling": Estimate time-to-default curves per borrower to set provisions, pricing and limits under IFRS 9 / CECL. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using current delinquency status instead of status as-of observation time.

## 2. Choose the signals

Your strongest signal is **Months-on-book hazard shape** (baseline hazard as piecewise-constant by account age). Its rule: Vintage effects mix with age if not stratified. In the starter, the closest executable idea is **risk factor (x0)**: raises the hazard. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

36% of subjects are censored: recent cohorts have simply not been observed long enough. Counting them as non-events gives 44.8% by month 12; dropping the incomplete ones gives 69.8%; the Kaplan-Meier estimate is 52.2%.

## 4. Baseline against the stronger design

A discrete-time hazard model trained on earlier cohorts ranks later cohorts with a concordance index of 0.719 and predicts a mean 52.1% risk, within 1.8% of observed by decile.

| Result | Value |
|---|---|
| Event rate by month 12 (Kaplan-Meier) | 52.2% |
| Counting censored as non-events | 44.8% |
| Dropping subjects not yet observed for a full period | 69.8% |
| Concordance index | 0.719 |
| Mean decile calibration gap | 1.8% |

## 5. An edge case from the blueprint

**Policy change mid-vintage.** approvals shift so the hazard baseline moves. Planned response: Add policy-version as a stratifier and monitor vintage curves. Write the test that replays this case through your pipeline before you tune anything.

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
| `subjects` | 6550 |
| `train_subjects` | 4257 |
| `test_subjects` | 2293 |
| `event_share` | 0.6374 |
| `censored_share` | 0.3626 |
| `at_month` | 12 |
| `km_event_rate` | 0.52223 |
| `naive_drop_censored_event_rate` | 0.6979 |
| `naive_bias_vs_km` | 0.17567 |
| `count_all_rows_event_rate` | 0.44832 |
| `count_all_rows_bias_vs_km` | -0.073909 |
| `discrete_time_mean_predicted_risk` | 0.52126 |
| `c_index` | 0.71927 |
| `decile_calibration_mean_abs_gap` | 0.017804 |
| `decile_calibration_max_abs_gap` | 0.046726 |

</details>
