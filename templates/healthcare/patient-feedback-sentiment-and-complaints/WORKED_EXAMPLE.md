# Patient Feedback & Complaint Mining: worked example

> Run on synthetic data with `nlp` engine, seed 7316, knobs {"n_docs": 4580}, in 2.9 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Mine surveys, reviews and complaints to surface actionable service and safety issues by unit and theme.

**Constraints that shape the design.** Anonymisation; Safety-event escalation; Multilingual

**Label in this use case.** For "Patient Feedback & Complaint Mining": Mine surveys, reviews and complaints to surface actionable service and safety issues by unit and theme. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels from star ratings only.

## 2. Choose the signals

Your strongest signal is **Topic-level sentiment** (sentiment per theme). Its rule: Topic model stable. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

25.7% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.888 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.458.

## 4. Baseline against the stronger design

The honest evaluation is 0.431 macro-F1 lower than the optimistic one. A frozen model scores 0.792 on the next month and 0.458 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.888 |
| Macro-F1, honest time split | 0.458 |
| Macro-F1, frozen model next month | 0.792 |
| Calibration error, honest split | 0.061 |
| Duplicate share | 25.7% |

## 5. An edge case from the blueprint

**Survey response bias (only extremes respond).** only very happy or very unhappy patients respond, skewing the view of service quality. Planned response: Weighting and complement with passive signals. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 4580 |
| `duplicate_share` | 0.25721 |
| `random_split_with_leak.macro_f1` | 0.88831 |
| `random_split_with_leak.ece` | 0.13274 |
| `time_split_clean.macro_f1` | 0.45753 |
| `time_split_clean.ece` | 0.061397 |
| `frozen_model_next_month.macro_f1` | 0.79241 |
| `frozen_model_next_month.ece` | 0.11465 |
| `frozen_model_months_6_7.macro_f1` | 0.45753 |
| `frozen_model_months_6_7.ece` | 0.061397 |

</details>
