# Complaint Root-Cause Mining: worked example

> Run on synthetic data with `nlp` engine, seed 63617, knobs {"n_docs": 5190}, in 1.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Classify complaints and cluster them by root cause so the bank fixes processes and meets regulatory complaint-handling duties.

**Constraints that shape the design.** Every complaint maps to the regulator's official categories; A reviewer signs off the classification and the root-cause report; A root-cause report goes to product owners every week

**Label in this use case.** For "Complaint Root-Cause Mining": Classify complaints and cluster them by root cause so the bank fixes processes and meets regulatory complaint-handling duties. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels from stressed staff vary with workload, so the training set is noisy.

## 2. Choose the signals

Your strongest signal is **Complaint embedding** (encoder vector of the complaint text clustered by similarity). Its rule: Language and writing style affect the clusters. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

26.2% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.899 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.445.

## 4. Baseline against the stronger design

The honest evaluation is 0.454 macro-F1 lower than the optimistic one. A frozen model scores 0.817 on the next month and 0.445 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.899 |
| Macro-F1, honest time split | 0.445 |
| Macro-F1, frozen model next month | 0.817 |
| Calibration error, honest split | 0.041 |
| Duplicate share | 26.2% |

## 5. An edge case from the blueprint

**Multi-issue complaint.** One complaint contains several issues and a single label hides the other causes. Planned response: Use multi-label classification and route by the highest-priority label. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 5190 |
| `duplicate_share` | 0.26224 |
| `random_split_with_leak.macro_f1` | 0.89856 |
| `random_split_with_leak.ece` | 0.12731 |
| `time_split_clean.macro_f1` | 0.44494 |
| `time_split_clean.ece` | 0.04114 |
| `frozen_model_next_month.macro_f1` | 0.81684 |
| `frozen_model_next_month.ece` | 0.11745 |
| `frozen_model_months_6_7.macro_f1` | 0.44494 |
| `frozen_model_months_6_7.ece` | 0.04114 |

</details>
