# Maintenance Request Triage & Dispatch: worked example

> Run on synthetic data with `nlp` engine, seed 51930, knobs {"n_docs": 4840}, in 1.6 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Classify tenant maintenance requests by urgency and trade and dispatch the right technician with the right parts.

**Constraints that shape the design.** Emergencies receive a technician or a response within 1 hour; Safety and habitability cases always escalate to a person; Tenants get status updates at each step

**Label in this use case.** For "Maintenance Request Triage & Dispatch": Classify tenant maintenance requests by urgency and trade and dispatch the right technician with the right parts. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels come from staff habits and may reflect past dispatch practice and not need.

## 2. Choose the signals

Your strongest signal is **Safety phrases** (presence of terms such as gas smell, flooding, no heating or sparks in the text). Its rule: Terms vary by language and dialect, so test on local phrasing. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

25.1% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.905 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.455.

## 4. Baseline against the stronger design

The honest evaluation is 0.450 macro-F1 lower than the optimistic one. A frozen model scores 0.846 on the next month and 0.455 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.905 |
| Macro-F1, honest time split | 0.455 |
| Macro-F1, frozen model next month | 0.846 |
| Calibration error, honest split | 0.059 |
| Duplicate share | 25.1% |

## 5. An edge case from the blueprint

**Emergency after hours.** An emergency arrives after hours when nobody reads the queue. Planned response: Route urgent categories to the on-call technician and page them automatically. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 4840 |
| `duplicate_share` | 0.25145 |
| `random_split_with_leak.macro_f1` | 0.90479 |
| `random_split_with_leak.ece` | 0.12853 |
| `time_split_clean.macro_f1` | 0.45486 |
| `time_split_clean.ece` | 0.059447 |
| `frozen_model_next_month.macro_f1` | 0.84617 |
| `frozen_model_next_month.ece` | 0.14264 |
| `frozen_model_months_6_7.macro_f1` | 0.45486 |
| `frozen_model_months_6_7.ece` | 0.059447 |

</details>
