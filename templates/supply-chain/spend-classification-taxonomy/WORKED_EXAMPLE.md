# Spend Classification & Taxonomy Mapping: worked example

> Run on synthetic data with `nlp` engine, seed 12221, knobs {"n_docs": 5370}, in 3.6 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Classify invoice and PO lines into a unified category taxonomy to unlock spend visibility and savings analysis.

**Constraints that shape the design.** 5-level taxonomy (UNSPSC); Multiple languages; Millions of lines

**Label in this use case.** For "Spend Classification & Taxonomy Mapping": Classify invoice and PO lines into a unified category taxonomy to unlock spend visibility and savings analysis. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training labels from earlier rule-based mappings.

## 2. Choose the signals

Your strongest signal is **Line description embedding** (text embedding). Its rule: Language handling. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

25.2% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.895 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.464.

## 4. Baseline against the stronger design

The honest evaluation is 0.431 macro-F1 lower than the optimistic one. A frozen model scores 0.793 on the next month and 0.464 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.895 |
| Macro-F1, honest time split | 0.464 |
| Macro-F1, frozen model next month | 0.793 |
| Calibration error, honest split | 0.050 |
| Duplicate share | 25.2% |

## 5. An edge case from the blueprint

**New category emerges.** forced into wrong class. Planned response: Open-set detection and taxonomy proposals. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 5370 |
| `duplicate_share` | 0.25214 |
| `random_split_with_leak.macro_f1` | 0.89502 |
| `random_split_with_leak.ece` | 0.13001 |
| `time_split_clean.macro_f1` | 0.46397 |
| `time_split_clean.ece` | 0.050492 |
| `frozen_model_next_month.macro_f1` | 0.79336 |
| `frozen_model_next_month.ece` | 0.1106 |
| `frozen_model_months_6_7.macro_f1` | 0.46397 |
| `frozen_model_months_6_7.ece` | 0.050492 |

</details>
