# Complaint Classification & Escalation: worked example

> Run on synthetic data with `nlp` engine, seed 66078, knobs {"n_docs": 6390}, in 7.6 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Classify complaints by type and severity and route those with regulatory or vulnerability risk to specialist teams within the required time.

**Constraints that shape the design.** Regulated complaint categories never auto-closed; Vulnerable customer indicators routed to a person; Classification explained to the handler

**Label in this use case.** For "Complaint Classification & Escalation": Classify complaints by type and severity and route those with regulatory or vulnerability risk to specialist teams within the required time. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Optimising accuracy not recall.

## 2. Choose the signals

Your strongest signal is **Complaint text cues** (phrases signalling service loss, billing error, mis-selling or threat). Its rule: Needs multilingual coverage. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

25.3% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.921 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.461.

## 4. Baseline against the stronger design

The honest evaluation is 0.460 macro-F1 lower than the optimistic one. A frozen model scores 0.820 on the next month and 0.461 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.921 |
| Macro-F1, honest time split | 0.461 |
| Macro-F1, frozen model next month | 0.820 |
| Calibration error, honest split | 0.059 |
| Duplicate share | 25.3% |

## 5. An edge case from the blueprint

**Mixed language.** classifier confusion. Planned response: Per-language evaluation and abstain to a person. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 6390 |
| `duplicate_share` | 0.25305 |
| `random_split_with_leak.macro_f1` | 0.92078 |
| `random_split_with_leak.ece` | 0.12642 |
| `time_split_clean.macro_f1` | 0.46105 |
| `time_split_clean.ece` | 0.059259 |
| `frozen_model_next_month.macro_f1` | 0.81951 |
| `frozen_model_next_month.ece` | 0.11831 |
| `frozen_model_months_6_7.macro_f1` | 0.46105 |
| `frozen_model_months_6_7.ece` | 0.059259 |

</details>
