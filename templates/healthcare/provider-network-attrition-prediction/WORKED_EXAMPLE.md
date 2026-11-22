# Provider Network Attrition Prediction: worked example

> Run on synthetic data with `survival` engine, seed 16247, knobs {"n": 8050, "dropout": 0.3}, in 0.6 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict provider or group departures or reduced participation so network teams can plan retention and continuity, with explainable operational drivers and a retention workflow, and no punitive use.

**Constraints that shape the design.** No punitive action follows from a score and the output is used only for legitimate network planning and outreach; Fairness and privacy review covers features and groups before launch and on a schedule; Scores are shown with operational drivers and not sensitive attributes

**Label in this use case.** For "Provider Network Attrition Prediction": Predict provider or group departures or reduced participation so network teams can plan retention and continuity, with explainable operational drivers and a retention workflow, and no punitive use. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using the score in payment or contracting decisions.

## 2. Choose the signals

Your strongest signal is **Contract end proximity** (time to the contract end or renewal date). Its rule: Contract records. In the starter, the closest executable idea is **risk factor (x0)**: raises the hazard. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

38% of subjects are censored: recent cohorts have simply not been observed long enough. Counting them as non-events gives 44.0% by month 12; dropping the incomplete ones gives 70.1%; the Kaplan-Meier estimate is 52.0%.

## 4. Baseline against the stronger design

A discrete-time hazard model trained on earlier cohorts ranks later cohorts with a concordance index of 0.720 and predicts a mean 51.9% risk, within 1.5% of observed by decile.

| Result | Value |
|---|---|
| Event rate by month 12 (Kaplan-Meier) | 52.0% |
| Counting censored as non-events | 44.0% |
| Dropping subjects not yet observed for a full period | 70.1% |
| Concordance index | 0.720 |
| Mean decile calibration gap | 1.5% |

## 5. An edge case from the blueprint

**Merger of provider groups.** history is split. Planned response: Group lineage. Write the test that replays this case through your pipeline before you tune anything.

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
| `subjects` | 8050 |
| `train_subjects` | 5232 |
| `test_subjects` | 2818 |
| `event_share` | 0.62186 |
| `censored_share` | 0.37814 |
| `at_month` | 12 |
| `km_event_rate` | 0.51971 |
| `naive_drop_censored_event_rate` | 0.70136 |
| `naive_bias_vs_km` | 0.18165 |
| `count_all_rows_event_rate` | 0.44003 |
| `count_all_rows_bias_vs_km` | -0.079684 |
| `discrete_time_mean_predicted_risk` | 0.5189 |
| `c_index` | 0.71989 |
| `decile_calibration_mean_abs_gap` | 0.014598 |
| `decile_calibration_max_abs_gap` | 0.041932 |

</details>
