# Issue Triage and Labelling: worked example

> Run on synthetic data with `nlp` engine, seed 58865, knobs {"n_docs": 5450}, in 6.4 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Classify new issues by type, component and priority and suggest the owner so reports reach the right team fast.

**Constraints that shape the design.** Suggested labels with confidence; Security issues routed privately and at once; Maintainers can override

**Label in this use case.** For "Issue Triage and Labelling": Classify new issues by type, component and priority and suggest the owner so reports reach the right team fast. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Reporter labels as truth.

## 2. Choose the signals

Your strongest signal is **Issue text and stack traces** (description and errors). Its rule: From the report. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

24.8% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.879 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.436.

## 4. Baseline against the stronger design

The honest evaluation is 0.443 macro-F1 lower than the optimistic one. A frozen model scores 0.815 on the next month and 0.436 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.879 |
| Macro-F1, honest time split | 0.436 |
| Macro-F1, frozen model next month | 0.815 |
| Calibration error, honest split | 0.035 |
| Duplicate share | 24.8% |

## 5. An edge case from the blueprint

**Vague report.** the text lacks detail. Planned response: Ask for details automatically. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 5450 |
| `duplicate_share` | 0.24789 |
| `random_split_with_leak.macro_f1` | 0.87886 |
| `random_split_with_leak.ece` | 0.12145 |
| `time_split_clean.macro_f1` | 0.43617 |
| `time_split_clean.ece` | 0.035066 |
| `frozen_model_next_month.macro_f1` | 0.81495 |
| `frozen_model_next_month.ece` | 0.11902 |
| `frozen_model_months_6_7.macro_f1` | 0.43617 |
| `frozen_model_months_6_7.ece` | 0.035066 |

</details>
