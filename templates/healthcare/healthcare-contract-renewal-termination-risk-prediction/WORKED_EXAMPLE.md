# Healthcare Contract Renewal & Termination Risk Prediction: worked example

> Run on synthetic data with `survival` engine, seed 77468, knobs {"n": 6030, "dropout": 0.112}, in 0.6 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Prioritise upcoming renewals and termination windows by value, performance, risk, utilisation and lead time, so owners start review early enough to renegotiate, renew or exit deliberately.

**Constraints that shape the design.** Notice dates are deterministic and the model only prioritises review; Legal and procurement owners decide renewal, renegotiation or termination; Outputs show decision deadline, evidence gaps and recommended start date

**Label in this use case.** For "Healthcare Contract Renewal & Termination Risk Prediction": Prioritise upcoming renewals and termination windows by value, performance, risk, utilisation and lead time, so owners start review early enough to renegotiate, renew or exit deliberately. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Predicting dates that the contract states.

## 2. Choose the signals

Your strongest signal is **Days to notice deadline minus review lead time** (remaining time before the latest action date less the usual review cycle). Its rule: Rule-computed. In the starter, the closest executable idea is **risk factor (x0)**: raises the hazard. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

34% of subjects are censored: recent cohorts have simply not been observed long enough. Counting them as non-events gives 45.2% by month 12; dropping the incomplete ones gives 67.8%; the Kaplan-Meier estimate is 51.3%.

## 4. Baseline against the stronger design

A discrete-time hazard model trained on earlier cohorts ranks later cohorts with a concordance index of 0.733 and predicts a mean 52.7% risk, within 2.1% of observed by decile.

| Result | Value |
|---|---|
| Event rate by month 12 (Kaplan-Meier) | 51.3% |
| Counting censored as non-events | 45.2% |
| Dropping subjects not yet observed for a full period | 67.8% |
| Concordance index | 0.733 |
| Mean decile calibration gap | 2.1% |

## 5. An edge case from the blueprint

**Auto-renewal clause.** the contract renews silently. Planned response: Auto-renewal flag with an earlier alert. Write the test that replays this case through your pipeline before you tune anything.

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
| `subjects` | 6030 |
| `train_subjects` | 3919 |
| `test_subjects` | 2111 |
| `event_share` | 0.6592 |
| `censored_share` | 0.3408 |
| `at_month` | 12 |
| `km_event_rate` | 0.51329 |
| `naive_drop_censored_event_rate` | 0.67827 |
| `naive_bias_vs_km` | 0.16497 |
| `count_all_rows_event_rate` | 0.45239 |
| `count_all_rows_bias_vs_km` | -0.060903 |
| `discrete_time_mean_predicted_risk` | 0.52711 |
| `c_index` | 0.73284 |
| `decile_calibration_mean_abs_gap` | 0.021355 |
| `decile_calibration_max_abs_gap` | 0.059249 |

</details>
