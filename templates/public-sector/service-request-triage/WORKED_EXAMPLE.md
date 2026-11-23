# Service Request Triage (311): worked example

> Run on synthetic data with `nlp` engine, seed 59272, knobs {"n_docs": 6590}, in 7.6 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Classify and route non-emergency service requests such as potholes, graffiti and noise from text and photos to the right team with a priority, so residents get faster fixes.

**Constraints that shape the design.** Emergency terms route to a person immediately; Category and priority with confidence; Duplicates linked to one job

**Label in this use case.** For "Service Request Triage (311)": Classify and route non-emergency service requests such as potholes, graffiti and noise from text and photos to the right team with a priority, so residents get faster fixes. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Prioritising by request volume.

## 2. Choose the signals

Your strongest signal is **Text and photo content** (description and image evidence). Its rule: From the request. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

25.5% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.909 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.488.

## 4. Baseline against the stronger design

The honest evaluation is 0.421 macro-F1 lower than the optimistic one. A frozen model scores 0.844 on the next month and 0.488 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.909 |
| Macro-F1, honest time split | 0.488 |
| Macro-F1, frozen model next month | 0.844 |
| Calibration error, honest split | 0.047 |
| Duplicate share | 25.5% |

## 5. An edge case from the blueprint

**Mixed requests.** one message has several issues. Planned response: Split into separate jobs. Write the test that replays this case through your pipeline before you tune anything.

## 6. What to expect on your own data

Trust the honest number, schedule retraining from the drift curve, and keep thread-level splits and the leak scan.

## 7. Do this next

1. `cd starter && make setup && make demo` to reproduce the table above.
2. Replace the synthetic generator with an extract of your data and keep the split, the leakage tests and the gates.
3. Run through `docs/02-delivery-plan.md` milestone by milestone; each exit gate is a number you can check.

<details>
<summary>Every number from this run</summary>

| Metric | Value |
|---|---|
| `docs` | 6590 |
| `duplicate_share` | 0.25539 |
| `random_split_with_leak.macro_f1` | 0.90898 |
| `random_split_with_leak.ece` | 0.12789 |
| `time_split_clean.macro_f1` | 0.48825 |
| `time_split_clean.ece` | 0.047456 |
| `frozen_model_next_month.macro_f1` | 0.8442 |
| `frozen_model_next_month.ece` | 0.11569 |
| `frozen_model_months_6_7.macro_f1` | 0.48825 |
| `frozen_model_months_6_7.ece` | 0.047456 |

</details>
