# Log Template Anomaly Detection: worked example

> Run on synthetic data with `nlp` engine, seed 27891, knobs {"n_docs": 4750}, in 5.2 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Learn normal log patterns per service, flag new or rare message templates and unusual rates after releases, and surface them with sample lines to engineers.

**Constraints that shape the design.** Personal data masked in logs before analysis; Detection within 2 minutes of onset; Anomalies show sample lines

**Label in this use case.** For "Log Template Anomaly Detection": Learn normal log patterns per service, flag new or rare message templates and unusual rates after releases, and surface them with sample lines to engineers. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Keyword alerts only.

## 2. Choose the signals

Your strongest signal is **Template frequency change** (rate of each template versus baseline). Its rule: From parsing. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

24.6% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.892 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.418.

## 4. Baseline against the stronger design

The honest evaluation is 0.474 macro-F1 lower than the optimistic one. A frozen model scores 0.792 on the next month and 0.418 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.892 |
| Macro-F1, honest time split | 0.418 |
| Macro-F1, frozen model next month | 0.792 |
| Calibration error, honest split | 0.041 |
| Duplicate share | 24.6% |

## 5. An edge case from the blueprint

**Verbose logging change.** a release changes log wording. Planned response: Template mapping across versions. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 4750 |
| `duplicate_share` | 0.24589 |
| `random_split_with_leak.macro_f1` | 0.89156 |
| `random_split_with_leak.ece` | 0.14214 |
| `time_split_clean.macro_f1` | 0.41791 |
| `time_split_clean.ece` | 0.040746 |
| `frozen_model_next_month.macro_f1` | 0.79248 |
| `frozen_model_next_month.ece` | 0.11538 |
| `frozen_model_months_6_7.macro_f1` | 0.41791 |
| `frozen_model_months_6_7.ece` | 0.040746 |

</details>
