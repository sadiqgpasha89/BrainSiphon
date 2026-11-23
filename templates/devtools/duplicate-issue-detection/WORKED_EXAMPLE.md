# Duplicate Issue Detection: worked example

> Run on synthetic data with `nlp` engine, seed 34342, knobs {"n_docs": 6650}, in 6.9 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Find existing issues that describe the same problem and link them so reports and fixes are not duplicated and users see known workarounds.

**Constraints that shape the design.** Suggest duplicates and never close automatically; Show the existing issue and workaround; Precision above 85% for suggested duplicates

**Label in this use case.** For "Duplicate Issue Detection": Find existing issues that describe the same problem and link them so reports and fixes are not duplicated and users see known workarounds. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Auto-closing duplicates.

## 2. Choose the signals

Your strongest signal is **Semantic similarity** (embedding similarity of texts). Its rule: From a text model. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

25.0% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.903 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.467.

## 4. Baseline against the stronger design

The honest evaluation is 0.436 macro-F1 lower than the optimistic one. A frozen model scores 0.814 on the next month and 0.467 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.903 |
| Macro-F1, honest time split | 0.467 |
| Macro-F1, frozen model next month | 0.814 |
| Calibration error, honest split | 0.035 |
| Duplicate share | 25.0% |

## 5. An edge case from the blueprint

**Similar symptoms.** different causes share symptoms. Planned response: Show candidates and let humans decide. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 6650 |
| `duplicate_share` | 0.24962 |
| `random_split_with_leak.macro_f1` | 0.90349 |
| `random_split_with_leak.ece` | 0.12671 |
| `time_split_clean.macro_f1` | 0.46702 |
| `time_split_clean.ece` | 0.034719 |
| `frozen_model_next_month.macro_f1` | 0.81381 |
| `frozen_model_next_month.ece` | 0.099489 |
| `frozen_model_months_6_7.macro_f1` | 0.46702 |
| `frozen_model_months_6_7.ece` | 0.034719 |

</details>
