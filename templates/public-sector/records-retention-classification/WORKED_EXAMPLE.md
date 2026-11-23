# Records Retention Classification: worked example

> Run on synthetic data with `nlp` engine, seed 79108, knobs {"n_docs": 4980}, in 6.1 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Classify documents and emails into records categories with retention rules so records are kept as long as the law requires and deleted when the period ends.

**Constraints that shape the design.** Category with confidence and the retention rule; Legal holds override deletion; Records officers approve disposal lists

**Label in this use case.** For "Records Retention Classification": Classify documents and emails into records categories with retention rules so records are kept as long as the law requires and deleted when the period ends. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Automatic deletion.

## 2. Choose the signals

Your strongest signal is **Document type and content** (text and attachments). Its rule: From the classifier. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

24.8% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.902 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.463.

## 4. Baseline against the stronger design

The honest evaluation is 0.439 macro-F1 lower than the optimistic one. A frozen model scores 0.843 on the next month and 0.463 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.902 |
| Macro-F1, honest time split | 0.463 |
| Macro-F1, frozen model next month | 0.843 |
| Calibration error, honest split | 0.053 |
| Duplicate share | 24.8% |

## 5. An edge case from the blueprint

**Unknown category.** no retention rule fits the document. Planned response: Abstain and ask an officer. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 4980 |
| `duplicate_share` | 0.24799 |
| `random_split_with_leak.macro_f1` | 0.90188 |
| `random_split_with_leak.ece` | 0.15359 |
| `time_split_clean.macro_f1` | 0.46316 |
| `time_split_clean.ece` | 0.052543 |
| `frozen_model_next_month.macro_f1` | 0.84279 |
| `frozen_model_next_month.ece` | 0.14547 |
| `frozen_model_months_6_7.macro_f1` | 0.46316 |
| `frozen_model_months_6_7.ece` | 0.052543 |

</details>
