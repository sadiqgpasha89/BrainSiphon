# Sepsis Early-Warning System: worked example

> Run on synthetic data with Hand-written starter, in 31.4 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Alert clinicians hours before sepsis onset from streaming vitals and labs, with alert burden low enough that nurses keep trusting it.

**Constraints that shape the design.** Alert fatigue budget under 1 alert per 10 patient-days; Works on EHR data with irregular sampling; Clinical explainability

**Label in this use case.** For "Sepsis Early-Warning System": Alert clinicians hours before sepsis onset from streaming vitals and labs, with alert burden low enough that nurses keep trusting it. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels set after the intervention are partly caused by it.

## 2. Choose the signals

Your strongest signal is **Lactate and trend** (latest lactate and 6h slope). Its rule: Use result time not draw time. In the starter, the closest executable idea is ****: . Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

This pack ships a hand-written starter with its own data generator, written to plant the traps named in the blueprint. Its README lists them one by one, and its tests make each one executable.

## 4. Baseline against the stronger design

The starter runs a baseline and a stronger design under the evaluation discipline the blueprint prescribes. The table at the end of this page lists every number from this run.

| Result | Value |
|---|---|
| patients | 2400 |
| train_patients | 1440 |
| test_patients | 480 |
| mews_like.threshold | 3 |
| mews_like.alerts_per_100_patient_days | 10.05 |
| mews_like.sensitivity | 0.6154 |

## 5. An edge case from the blueprint

**New lab analyser changes units.** lactate values shift tenfold for some wards. Planned response: Unit-normalisation layer with range checks at ingest. Write the test that replays this case through your pipeline before you tune anything.

## 6. What to expect on your own data

Read starter/README.md for the milestone-by-milestone expectations; then replace the synthetic generator with your data and keep the tests.

## 7. Do this next

1. `cd starter && make setup && make demo` to reproduce the table above.
2. Replace the synthetic generator with an extract of your data and keep the split, the leakage tests and the gates.
3. Run through `docs/02-delivery-plan.md` milestone by milestone; each exit gate is a number you can check.

<details>
<summary>Every number from this run</summary>

| Metric | Value |
|---|---|
| `patients` | 2400 |
| `train_patients` | 1440 |
| `test_patients` | 480 |
| `mews_like.threshold` | 3 |
| `mews_like.alerts_per_100_patient_days` | 10.048 |
| `mews_like.sensitivity` | 0.61538 |
| `mews_like.median_lead_time_h` | 2 |
| `mews_like.n_sepsis` | 52 |
| `gbdt.threshold` | 0.092274 |
| `gbdt.alerts_per_100_patient_days` | 6.1284 |
| `gbdt.sensitivity` | 0.98077 |
| `gbdt.median_lead_time_h` | 3 |
| `gbdt.n_sepsis` | 52 |

</details>
