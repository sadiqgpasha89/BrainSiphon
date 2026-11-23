# Data Loss Prevention Classification: worked example

> Run on synthetic data with `nlp` engine, seed 80233, knobs {"n_docs": 5190}, in 5.8 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Classify documents and messages by sensitivity to improve data loss prevention rules, blocking or warning on risky sharing with the content analysed in the control and not in analyst tools.

**Constraints that shape the design.** Block only at high confidence with a user override path; Content stays inside the control; Policy owners approve rule changes

**Label in this use case.** For "Data Loss Prevention Classification": Classify documents and messages by sensitivity to improve data loss prevention rules, blocking or warning on risky sharing with the content analysed in the control and not in analyst tools. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Pattern-only rules.

## 2. Choose the signals

Your strongest signal is **Content classifier output** (predicted sensitivity class). Its rule: From the classifier. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

25.8% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.913 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.507.

## 4. Baseline against the stronger design

The honest evaluation is 0.406 macro-F1 lower than the optimistic one. A frozen model scores 0.806 on the next month and 0.507 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.913 |
| Macro-F1, honest time split | 0.507 |
| Macro-F1, frozen model next month | 0.806 |
| Calibration error, honest split | 0.078 |
| Duplicate share | 25.8% |

## 5. An edge case from the blueprint

**Encrypted files.** content cannot be read. Planned response: Metadata and destination rules. Write the test that replays this case through your pipeline before you tune anything.

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
| `duplicate_share` | 0.25819 |
| `random_split_with_leak.macro_f1` | 0.91285 |
| `random_split_with_leak.ece` | 0.14395 |
| `time_split_clean.macro_f1` | 0.50658 |
| `time_split_clean.ece` | 0.077609 |
| `frozen_model_next_month.macro_f1` | 0.80602 |
| `frozen_model_next_month.ece` | 0.1242 |
| `frozen_model_months_6_7.macro_f1` | 0.50658 |
| `frozen_model_months_6_7.ece` | 0.077609 |

</details>
