# EHS Incident Report Classification: worked example

> Run on synthetic data with `nlp` engine, seed 45299, knobs {"n_docs": 6720}, in 7.2 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Classify safety incident and near-miss reports by type, severity and cause category so EHS teams find systemic hazards faster.

**Constraints that shape the design.** Severe incidents routed to a person immediately; Report text redacted of names before analytics; Multilingual support

**Label in this use case.** For "EHS Incident Report Classification": Classify safety incident and near-miss reports by type, severity and cause category so EHS teams find systemic hazards faster. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Classifying by outcome only.

## 2. Choose the signals

Your strongest signal is **Hazard and energy source terms** (named hazards such as pressure, height or moving parts). Its rule: Maintain a lexicon. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

25.5% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.905 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.425.

## 4. Baseline against the stronger design

The honest evaluation is 0.480 macro-F1 lower than the optimistic one. A frozen model scores 0.824 on the next month and 0.425 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.905 |
| Macro-F1, honest time split | 0.425 |
| Macro-F1, frozen model next month | 0.824 |
| Calibration error, honest split | 0.038 |
| Duplicate share | 25.5% |

## 5. An edge case from the blueprint

**Underreported incidents.** reports are missing. Planned response: Show reporting rates by area and encourage reporting. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 6720 |
| `duplicate_share` | 0.25476 |
| `random_split_with_leak.macro_f1` | 0.90476 |
| `random_split_with_leak.ece` | 0.11509 |
| `time_split_clean.macro_f1` | 0.42521 |
| `time_split_clean.ece` | 0.037557 |
| `frozen_model_next_month.macro_f1` | 0.82445 |
| `frozen_model_next_month.ece` | 0.099848 |
| `frozen_model_months_6_7.macro_f1` | 0.42521 |
| `frozen_model_months_6_7.ece` | 0.037557 |

</details>
