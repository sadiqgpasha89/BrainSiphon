# RFI Triage and Response Drafting: worked example

> Run on synthetic data with `nlp` engine, seed 19751, knobs {"n_docs": 4660}, in 5.2 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Classify requests for information, find the relevant drawings and specifications and draft a response for the design team to review, tracking time to answer.

**Constraints that shape the design.** Responses cite drawing and specification references; Design team approves every response; Contract deadlines tracked

**Label in this use case.** For "RFI Triage and Response Drafting": Classify requests for information, find the relevant drawings and specifications and draft a response for the design team to review, tracking time to answer. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Answers without citations.

## 2. Choose the signals

Your strongest signal is **RFI text and sketch** (the question and attachments). Its rule: From the RFI system. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

24.1% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.900 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.421.

## 4. Baseline against the stronger design

The honest evaluation is 0.479 macro-F1 lower than the optimistic one. A frozen model scores 0.804 on the next month and 0.421 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.900 |
| Macro-F1, honest time split | 0.421 |
| Macro-F1, frozen model next month | 0.804 |
| Calibration error, honest split | 0.026 |
| Duplicate share | 24.1% |

## 5. An edge case from the blueprint

**Conflicting documents.** drawings and specifications disagree. Planned response: Show the conflict and escalate. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 4660 |
| `duplicate_share` | 0.2412 |
| `random_split_with_leak.macro_f1` | 0.89964 |
| `random_split_with_leak.ece` | 0.15475 |
| `time_split_clean.macro_f1` | 0.42071 |
| `time_split_clean.ece` | 0.02594 |
| `frozen_model_next_month.macro_f1` | 0.80365 |
| `frozen_model_next_month.ece` | 0.13167 |
| `frozen_model_months_6_7.macro_f1` | 0.42071 |
| `frozen_model_months_6_7.ece` | 0.02594 |

</details>
