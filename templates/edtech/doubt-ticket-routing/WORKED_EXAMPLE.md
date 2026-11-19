# Doubt & Help Ticket Routing: worked example

> Run on synthetic data with `nlp` engine, seed 66310, knobs {"n_docs": 5440}, in 1.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Route student doubts to the best available teacher or TA by topic and expertise, minimising wait and improving resolution.

**Constraints that shape the design.** SLA targets; Teacher availability; Fair load distribution

**Label in this use case.** For "Doubt & Help Ticket Routing": Route student doubts to the best available teacher or TA by topic and expertise, minimising wait and improving resolution. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Teacher feedback biased.

## 2. Choose the signals

Your strongest signal is **Topic classification** (topic probabilities). Its rule: Taxonomy. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

25.7% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.886 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.455.

## 4. Baseline against the stronger design

The honest evaluation is 0.431 macro-F1 lower than the optimistic one. A frozen model scores 0.774 on the next month and 0.455 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.886 |
| Macro-F1, honest time split | 0.455 |
| Macro-F1, frozen model next month | 0.774 |
| Calibration error, honest split | 0.031 |
| Duplicate share | 25.7% |

## 5. An edge case from the blueprint

**Exam-eve surge.** a surge the night before exams floods the queue and response times explode. Planned response: Surge staffing alerts and auto-triage. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 5440 |
| `duplicate_share` | 0.25699 |
| `random_split_with_leak.macro_f1` | 0.88642 |
| `random_split_with_leak.ece` | 0.12977 |
| `time_split_clean.macro_f1` | 0.45516 |
| `time_split_clean.ece` | 0.031419 |
| `frozen_model_next_month.macro_f1` | 0.77383 |
| `frozen_model_next_month.ece` | 0.10726 |
| `frozen_model_months_6_7.macro_f1` | 0.45516 |
| `frozen_model_months_6_7.ece` | 0.031419 |

</details>
