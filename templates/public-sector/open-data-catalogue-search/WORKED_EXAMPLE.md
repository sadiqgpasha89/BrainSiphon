# Open Data Catalogue Search and Quality: worked example

> Run on synthetic data with `nlp` engine, seed 90092, knobs {"n_docs": 5400}, in 6.4 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Help people find public datasets by meaning and check their quality and freshness so open data gets used and problems are fixed at the source.

**Constraints that shape the design.** Search by meaning and by field; Quality and freshness shown with each dataset; No personal data in published sets

**Label in this use case.** For "Open Data Catalogue Search and Quality": Help people find public datasets by meaning and check their quality and freshness so open data gets used and problems are fixed at the source. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Keyword-only search.

## 2. Choose the signals

Your strongest signal is **Query to dataset similarity** (semantic match of query and description). Its rule: Embeddings. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

25.6% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.799 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.435.

## 4. Baseline against the stronger design

The honest evaluation is 0.364 macro-F1 lower than the optimistic one. A frozen model scores 0.898 on the next month and 0.435 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.799 |
| Macro-F1, honest time split | 0.435 |
| Macro-F1, frozen model next month | 0.898 |
| Calibration error, honest split | 0.075 |
| Duplicate share | 25.6% |

## 5. An edge case from the blueprint

**Stale dataset.** updates stopped. Planned response: Freshness alerts to the publisher. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 5400 |
| `duplicate_share` | 0.25593 |
| `random_split_with_leak.macro_f1` | 0.79885 |
| `random_split_with_leak.ece` | 0.11655 |
| `time_split_clean.macro_f1` | 0.43523 |
| `time_split_clean.ece` | 0.075044 |
| `frozen_model_next_month.macro_f1` | 0.89826 |
| `frozen_model_next_month.ece` | 0.11501 |
| `frozen_model_months_6_7.macro_f1` | 0.43523 |
| `frozen_model_months_6_7.ece` | 0.075044 |

</details>
