# Support Ticket Triage & Priority: worked example

> Run on synthetic data with `nlp` engine, seed 54915, knobs {"n_docs": 4790}, in 3.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Classify ticket category, urgency and required skill at creation, and route to the right queue meeting SLA.

**Constraints that shape the design.** SLA tiers; Multilingual; Real-time routing

**Label in this use case.** For "Support Ticket Triage & Priority": Classify ticket category, urgency and required skill at creation, and route to the right queue meeting SLA. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels from past misrouted tickets.

## 2. Choose the signals

Your strongest signal is **Account tier and SLA** (contract tier). Its rule: CRM. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

24.6% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.898 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.453.

## 4. Baseline against the stronger design

The honest evaluation is 0.445 macro-F1 lower than the optimistic one. A frozen model scores 0.808 on the next month and 0.453 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.898 |
| Macro-F1, honest time split | 0.453 |
| Macro-F1, frozen model next month | 0.808 |
| Calibration error, honest split | 0.057 |
| Duplicate share | 24.6% |

## 5. An edge case from the blueprint

**Incident causes a flood of near-identical tickets.** queue overwhelmed. Planned response: Incident clustering and bulk handling. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 4790 |
| `duplicate_share` | 0.24593 |
| `random_split_with_leak.macro_f1` | 0.89804 |
| `random_split_with_leak.ece` | 0.14226 |
| `time_split_clean.macro_f1` | 0.45315 |
| `time_split_clean.ece` | 0.056901 |
| `frozen_model_next_month.macro_f1` | 0.80849 |
| `frozen_model_next_month.ece` | 0.11399 |
| `frozen_model_months_6_7.macro_f1` | 0.45315 |
| `frozen_model_months_6_7.ece` | 0.056901 |

</details>
