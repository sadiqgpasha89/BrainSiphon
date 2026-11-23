# Project Health Reporting: worked example

> Run on synthetic data with `nlp` engine, seed 9814, knobs {"n_docs": 5640}, in 6.0 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Draft weekly project status reports from schedule, cost, risk and issue data with cited figures and a plain narrative for the project manager to edit and send.

**Constraints that shape the design.** Every figure links to its source system; Project manager approves before sending; Unconfirmed items marked

**Label in this use case.** For "Project Health Reporting": Draft weekly project status reports from schedule, cost, risk and issue data with cited figures and a plain narrative for the project manager to edit and send. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Chat as source.

## 2. Choose the signals

Your strongest signal is **Schedule and cost status** (variance and forecasts). Its rule: From project controls. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

24.2% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.883 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.460.

## 4. Baseline against the stronger design

The honest evaluation is 0.423 macro-F1 lower than the optimistic one. A frozen model scores 0.788 on the next month and 0.460 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.883 |
| Macro-F1, honest time split | 0.460 |
| Macro-F1, frozen model next month | 0.788 |
| Calibration error, honest split | 0.069 |
| Duplicate share | 24.2% |

## 5. An edge case from the blueprint

**Data conflicts.** two systems disagree. Planned response: List the conflict and ask the manager. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 5640 |
| `duplicate_share` | 0.24184 |
| `random_split_with_leak.macro_f1` | 0.88325 |
| `random_split_with_leak.ece` | 0.13563 |
| `time_split_clean.macro_f1` | 0.45991 |
| `time_split_clean.ece` | 0.069217 |
| `frozen_model_next_month.macro_f1` | 0.7885 |
| `frozen_model_next_month.ece` | 0.10117 |
| `frozen_model_months_6_7.macro_f1` | 0.45991 |
| `frozen_model_months_6_7.ece` | 0.069217 |

</details>
