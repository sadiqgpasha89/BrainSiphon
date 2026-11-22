# Provider Credential Expiration & Renewal Prediction: worked example

> Run on synthetic data with `survival` engine, seed 51000, knobs {"n": 8620, "dropout": 0.232}, in 0.7 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict which credential renewals are at risk of missing their deadline and prioritise outreach before a licence, certification or coverage lapses.

**Constraints that shape the design.** Deadline rules are deterministic and the model only prioritises outreach; Authorised credentialing staff confirm status and contact providers; A lapse is never inferred from a prediction

**Label in this use case.** For "Provider Credential Expiration & Renewal Prediction": Predict which credential renewals are at risk of missing their deadline and prioritise outreach before a licence, certification or coverage lapses. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Treating open renewals as failures.

## 2. Choose the signals

Your strongest signal is **Days to expiry minus expected completion time** (remaining time minus the typical verification turnaround). Its rule: Use the verification turnaround known at scoring time. In the starter, the closest executable idea is **risk factor (x0)**: raises the hazard. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

37% of subjects are censored: recent cohorts have simply not been observed long enough. Counting them as non-events gives 44.4% by month 12; dropping the incomplete ones gives 71.5%; the Kaplan-Meier estimate is 52.0%.

## 4. Baseline against the stronger design

A discrete-time hazard model trained on earlier cohorts ranks later cohorts with a concordance index of 0.724 and predicts a mean 53.3% risk, within 2.3% of observed by decile.

| Result | Value |
|---|---|
| Event rate by month 12 (Kaplan-Meier) | 52.0% |
| Counting censored as non-events | 44.4% |
| Dropping subjects not yet observed for a full period | 71.5% |
| Concordance index | 0.724 |
| Mean decile calibration gap | 2.3% |

## 5. An edge case from the blueprint

**Verification source outage.** turnaround spikes. Planned response: Source-health feature and a manual escalation path. Write the test that replays this case through your pipeline before you tune anything.

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
| `subjects` | 8620 |
| `train_subjects` | 5603 |
| `test_subjects` | 3017 |
| `event_share` | 0.6319 |
| `censored_share` | 0.3681 |
| `at_month` | 12 |
| `km_event_rate` | 0.52014 |
| `naive_drop_censored_event_rate` | 0.71543 |
| `naive_bias_vs_km` | 0.19529 |
| `count_all_rows_event_rate` | 0.44415 |
| `count_all_rows_bias_vs_km` | -0.075994 |
| `discrete_time_mean_predicted_risk` | 0.53262 |
| `c_index` | 0.72395 |
| `decile_calibration_mean_abs_gap` | 0.023364 |
| `decile_calibration_max_abs_gap` | 0.043224 |

</details>
