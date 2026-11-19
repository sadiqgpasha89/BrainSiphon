# Source-Code Plagiarism Detection: worked example

> Run on synthetic data with `nlp` engine, seed 5765, knobs {"n_docs": 6690}, in 4.3 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect collusion and copying in programming assignments robustly to renaming and restructuring, with evidence for review.

**Constraints that shape the design.** Common starter code; Obfuscation; Fair investigations

**Label in this use case.** For "Source-Code Plagiarism Detection": Detect collusion and copying in programming assignments robustly to renaming and restructuring, with evidence for review. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Seeded plagiarism too simple.

## 2. Choose the signals

Your strongest signal is **AST subtree similarity** (normalised AST matches). Its rule: Normalisation. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

25.1% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.912 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.459.

## 4. Baseline against the stronger design

The honest evaluation is 0.453 macro-F1 lower than the optimistic one. A frozen model scores 0.793 on the next month and 0.459 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.912 |
| Macro-F1, honest time split | 0.459 |
| Macro-F1, frozen model next month | 0.793 |
| Calibration error, honest split | 0.041 |
| Duplicate share | 25.1% |

## 5. An edge case from the blueprint

**Highly constrained tiny assignments.** many unavoidable matches. Planned response: Problem-level baselines and rarity weighting. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 6690 |
| `duplicate_share` | 0.25112 |
| `random_split_with_leak.macro_f1` | 0.91159 |
| `random_split_with_leak.ece` | 0.13125 |
| `time_split_clean.macro_f1` | 0.45874 |
| `time_split_clean.ece` | 0.041477 |
| `frozen_model_next_month.macro_f1` | 0.79324 |
| `frozen_model_next_month.ece` | 0.090345 |
| `frozen_model_months_6_7.macro_f1` | 0.45874 |
| `frozen_model_months_6_7.ece` | 0.041477 |

</details>
