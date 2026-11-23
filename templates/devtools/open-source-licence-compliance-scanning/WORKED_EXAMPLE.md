# Open Source Licence Compliance Scanning: worked example

> Run on synthetic data with `nlp` engine, seed 72464, knobs {"n_docs": 6720}, in 7.5 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Identify licences in dependencies and copied code, flag conflicts with company policy and explain obligations so releases do not ship with licence violations.

**Constraints that shape the design.** Every finding cites the file and the licence text; Legal decides exceptions; Restricted licences blocked at the merge gate

**Label in this use case.** For "Open Source Licence Compliance Scanning": Identify licences in dependencies and copied code, flag conflicts with company policy and explain obligations so releases do not ship with licence violations. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Model memory of licences.

## 2. Choose the signals

Your strongest signal is **Licence text match** (match to known licences). Its rule: From scanners. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

25.0% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.890 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.451.

## 4. Baseline against the stronger design

The honest evaluation is 0.439 macro-F1 lower than the optimistic one. A frozen model scores 0.733 on the next month and 0.451 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.890 |
| Macro-F1, honest time split | 0.451 |
| Macro-F1, frozen model next month | 0.733 |
| Calibration error, honest split | 0.044 |
| Duplicate share | 25.0% |

## 5. An edge case from the blueprint

**Dual licences.** a package offers two licences. Planned response: Choice recorded by legal. Write the test that replays this case through your pipeline before you tune anything.

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
| `duplicate_share` | 0.24955 |
| `random_split_with_leak.macro_f1` | 0.88991 |
| `random_split_with_leak.ece` | 0.11526 |
| `time_split_clean.macro_f1` | 0.4508 |
| `time_split_clean.ece` | 0.04372 |
| `frozen_model_next_month.macro_f1` | 0.73323 |
| `frozen_model_next_month.ece` | 0.077177 |
| `frozen_model_months_6_7.macro_f1` | 0.4508 |
| `frozen_model_months_6_7.ece` | 0.04372 |

</details>
