# Suitability & Mis-Selling Detection: worked example

> Run on synthetic data with `nlp` engine, seed 50436, knobs {"n_docs": 6610}, in 4.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Review advised sales and call records to find products that do not fit the client's profile or were sold with misleading statements.

**Constraints that shape the design.** Reviewers see evidence for each flag; Review capacity of 400 cases a week; Records retained under conduct rules

**Label in this use case.** For "Suitability & Mis-Selling Detection": Review advised sales and call records to find products that do not fit the client's profile or were sold with misleading statements. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Confirmed breaches are those that complained, a biased label.

## 2. Choose the signals

Your strongest signal is **Risk mismatch** (product risk class minus client risk tolerance). Its rule: Questionnaires age. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

25.4% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.869 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.460.

## 4. Baseline against the stronger design

The honest evaluation is 0.409 macro-F1 lower than the optimistic one. A frozen model scores 0.807 on the next month and 0.460 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.869 |
| Macro-F1, honest time split | 0.460 |
| Macro-F1, frozen model next month | 0.807 |
| Calibration error, honest split | 0.050 |
| Duplicate share | 25.4% |

## 5. An edge case from the blueprint

**Updated client profile after sale.** A client's risk profile changes after the sale, so fit at the time cannot be read from today's profile. Planned response: Use the client profile as it stood on the sale date and keep a history of changes. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 6610 |
| `duplicate_share` | 0.25356 |
| `random_split_with_leak.macro_f1` | 0.86927 |
| `random_split_with_leak.ece` | 0.10793 |
| `time_split_clean.macro_f1` | 0.46046 |
| `time_split_clean.ece` | 0.050435 |
| `frozen_model_next_month.macro_f1` | 0.80663 |
| `frozen_model_next_month.ece` | 0.10348 |
| `frozen_model_months_6_7.macro_f1` | 0.46046 |
| `frozen_model_months_6_7.ece` | 0.050435 |

</details>
