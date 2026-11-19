# Curriculum Standards Alignment & Tagging: worked example

> Run on synthetic data with `nlp` engine, seed 90830, knobs {"n_docs": 5910}, in 2.8 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Tag content and assessments with curriculum standards and skills automatically, enabling precise search and gap analysis.

**Constraints that shape the design.** Many frameworks and versions; Multi-label hierarchy; Teacher review

**Label in this use case.** For "Curriculum Standards Alignment & Tagging": Tag content and assessments with curriculum standards and skills automatically, enabling precise search and gap analysis. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Test content similar to training.

## 2. Choose the signals

Your strongest signal is **Content-standard semantic similarity** (embedding similarity). Its rule: Domain tuning. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

25.0% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.894 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.462.

## 4. Baseline against the stronger design

The honest evaluation is 0.432 macro-F1 lower than the optimistic one. A frozen model scores 0.792 on the next month and 0.462 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.894 |
| Macro-F1, honest time split | 0.462 |
| Macro-F1, frozen model next month | 0.792 |
| Calibration error, honest split | 0.051 |
| Duplicate share | 25.0% |

## 5. An edge case from the blueprint

**New standards version published.** old tags orphaned. Planned response: Crosswalk tables and bulk re-mapping. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 5910 |
| `duplicate_share` | 0.24992 |
| `random_split_with_leak.macro_f1` | 0.89407 |
| `random_split_with_leak.ece` | 0.12344 |
| `time_split_clean.macro_f1` | 0.46229 |
| `time_split_clean.ece` | 0.050855 |
| `frozen_model_next_month.macro_f1` | 0.79164 |
| `frozen_model_next_month.ece` | 0.092882 |
| `frozen_model_months_6_7.macro_f1` | 0.46229 |
| `frozen_model_months_6_7.ece` | 0.050855 |

</details>
