# Project Risk Register Assistant: worked example

> Run on synthetic data with `nlp` engine, seed 34184, knobs {"n_docs": 5040}, in 6.2 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Suggest risks from project documents, past projects and lessons learned, check the register for gaps and duplicates and help owners write clear risks with causes, effects and actions.

**Constraints that shape the design.** Owners confirm every risk; Suggestions cite their source; Duplicates flagged

**Label in this use case.** For "Project Risk Register Assistant": Suggest risks from project documents, past projects and lessons learned, check the register for gaps and duplicates and help owners write clear risks with causes, effects and actions. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Generic risk lists.

## 2. Choose the signals

Your strongest signal is **Project scope and stage** (type and phase). Its rule: From project data. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

25.1% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.900 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.431.

## 4. Baseline against the stronger design

The honest evaluation is 0.469 macro-F1 lower than the optimistic one. A frozen model scores 0.773 on the next month and 0.431 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.900 |
| Macro-F1, honest time split | 0.431 |
| Macro-F1, frozen model next month | 0.773 |
| Calibration error, honest split | 0.035 |
| Duplicate share | 25.1% |

## 5. An edge case from the blueprint

**Unique project.** no similar projects exist. Planned response: Structured prompts for workshops. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 5040 |
| `duplicate_share` | 0.25079 |
| `random_split_with_leak.macro_f1` | 0.90017 |
| `random_split_with_leak.ece` | 0.12722 |
| `time_split_clean.macro_f1` | 0.43109 |
| `time_split_clean.ece` | 0.035044 |
| `frozen_model_next_month.macro_f1` | 0.77257 |
| `frozen_model_next_month.ece` | 0.1007 |
| `frozen_model_months_6_7.macro_f1` | 0.43109 |
| `frozen_model_months_6_7.ece` | 0.035044 |

</details>
