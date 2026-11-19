# Medical Coding Automation (ICD-10 / CPT): worked example

> Run on synthetic data with `nlp` engine, seed 82078, knobs {"n_docs": 4670}, in 1.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Assign accurate diagnosis and procedure codes from clinical documentation to speed billing and cut denials, with coder oversight.

**Constraints that shape the design.** 70,000 ICD-10 codes; Auditable evidence spans; Payer-specific rules

**Label in this use case.** For "Medical Coding Automation (ICD-10 / CPT)": Assign accurate diagnosis and procedure codes from clinical documentation to speed billing and cut denials, with coder oversight. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Silver labels from past coding errors.

## 2. Choose the signals

Your strongest signal is **Evidence span match** (highlighted text span linked to code). Its rule: Span annotation. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

26.0% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.889 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.435.

## 4. Baseline against the stronger design

The honest evaluation is 0.454 macro-F1 lower than the optimistic one. A frozen model scores 0.778 on the next month and 0.435 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.889 |
| Macro-F1, honest time split | 0.435 |
| Macro-F1, frozen model next month | 0.778 |
| Calibration error, honest split | 0.031 |
| Duplicate share | 26.0% |

## 5. An edge case from the blueprint

**Annual code-set update.** invalid or deprecated codes assigned. Planned response: Versioned code-sets and regression tests at update. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 4670 |
| `duplicate_share` | 0.25974 |
| `random_split_with_leak.macro_f1` | 0.88925 |
| `random_split_with_leak.ece` | 0.13835 |
| `time_split_clean.macro_f1` | 0.4352 |
| `time_split_clean.ece` | 0.030891 |
| `frozen_model_next_month.macro_f1` | 0.77752 |
| `frozen_model_next_month.ece` | 0.09913 |
| `frozen_model_months_6_7.macro_f1` | 0.4352 |
| `frozen_model_months_6_7.ece` | 0.030891 |

</details>
