# Work Order Failure Code Classification: worked example

> Run on synthetic data with `nlp` engine, seed 3773, knobs {"n_docs": 5570}, in 5.0 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Assign standard failure codes and causes to maintenance work orders from technician text so reliability analysis rests on consistent data.

**Constraints that shape the design.** Technician confirms the suggested code; Codes follow the company taxonomy; Multilingual text supported

**Label in this use case.** For "Work Order Failure Code Classification": Assign standard failure codes and causes to maintenance work orders from technician text so reliability analysis rests on consistent data. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on hurried default picks.

## 2. Choose the signals

Your strongest signal is **Component and symptom terms** (named parts and symptoms in the text). Its rule: Maintain a synonym list. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

25.2% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.903 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.458.

## 4. Baseline against the stronger design

The honest evaluation is 0.445 macro-F1 lower than the optimistic one. A frozen model scores 0.843 on the next month and 0.458 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.903 |
| Macro-F1, honest time split | 0.458 |
| Macro-F1, frozen model next month | 0.843 |
| Calibration error, honest split | 0.050 |
| Duplicate share | 25.2% |

## 5. An edge case from the blueprint

**Slang and abbreviations.** the classifier misreads the text. Planned response: Site-specific lexicons and a review loop. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 5570 |
| `duplicate_share` | 0.25153 |
| `random_split_with_leak.macro_f1` | 0.90263 |
| `random_split_with_leak.ece` | 0.13337 |
| `time_split_clean.macro_f1` | 0.45779 |
| `time_split_clean.ece` | 0.050164 |
| `frozen_model_next_month.macro_f1` | 0.84256 |
| `frozen_model_next_month.ece` | 0.12533 |
| `frozen_model_months_6_7.macro_f1` | 0.45779 |
| `frozen_model_months_6_7.ece` | 0.050164 |

</details>
