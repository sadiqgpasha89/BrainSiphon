# Support Ticket to Bug Linking: worked example

> Run on synthetic data with `nlp` engine, seed 88180, knobs {"n_docs": 4870}, in 5.5 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Link customer support tickets to the engineering bugs behind them so engineering sees real customer impact and support sees fix status.

**Constraints that shape the design.** Customer personal data removed before linking; Links suggested for agents to confirm; Impact counts by bug

**Label in this use case.** For "Support Ticket to Bug Linking": Link customer support tickets to the engineering bugs behind them so engineering sees real customer impact and support sees fix status. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Customer identity in bug trackers.

## 2. Choose the signals

Your strongest signal is **Error message and version match** (reported error and version). Its rule: From extraction. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

24.1% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.901 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.445.

## 4. Baseline against the stronger design

The honest evaluation is 0.456 macro-F1 lower than the optimistic one. A frozen model scores 0.769 on the next month and 0.445 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.901 |
| Macro-F1, honest time split | 0.445 |
| Macro-F1, frozen model next month | 0.769 |
| Calibration error, honest split | 0.059 |
| Duplicate share | 24.1% |

## 5. An edge case from the blueprint

**No matching bug.** the issue is new. Planned response: Suggest a new bug with a draft. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 4870 |
| `duplicate_share` | 0.24107 |
| `random_split_with_leak.macro_f1` | 0.90071 |
| `random_split_with_leak.ece` | 0.14269 |
| `time_split_clean.macro_f1` | 0.4447 |
| `time_split_clean.ece` | 0.058584 |
| `frozen_model_next_month.macro_f1` | 0.7694 |
| `frozen_model_next_month.ece` | 0.10201 |
| `frozen_model_months_6_7.macro_f1` | 0.4447 |
| `frozen_model_months_6_7.ece` | 0.058584 |

</details>
