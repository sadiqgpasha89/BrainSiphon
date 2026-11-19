# Automated Essay Scoring: worked example

> Run on synthetic data with `nlp` engine, seed 82568, knobs {"n_docs": 5320}, in 2.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Score essays against rubrics with human-level agreement and give actionable feedback, with transparency and fairness.

**Constraints that shape the design.** Agreement with expert raters (QWK); Bias auditing across groups; Gaming resistance

**Label in this use case.** For "Automated Essay Scoring": Score essays against rubrics with human-level agreement and give actionable feedback, with transparency and fairness. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on single-rater scores.

## 2. Choose the signals

Your strongest signal is **Rubric trait scores** (multi-head trait predictions). Its rule: Annotated rubric. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

25.0% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.885 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.428.

## 4. Baseline against the stronger design

The honest evaluation is 0.457 macro-F1 lower than the optimistic one. A frozen model scores 0.811 on the next month and 0.428 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.885 |
| Macro-F1, honest time split | 0.428 |
| Macro-F1, frozen model next month | 0.811 |
| Calibration error, honest split | 0.049 |
| Duplicate share | 25.0% |

## 5. An edge case from the blueprint

**Essay topics change between years.** score distribution shifts. Planned response: Prompt-specific calibration and anchor essays. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 5320 |
| `duplicate_share` | 0.25019 |
| `random_split_with_leak.macro_f1` | 0.88473 |
| `random_split_with_leak.ece` | 0.1294 |
| `time_split_clean.macro_f1` | 0.42802 |
| `time_split_clean.ece` | 0.048946 |
| `frozen_model_next_month.macro_f1` | 0.81052 |
| `frozen_model_next_month.ece` | 0.1328 |
| `frozen_model_months_6_7.macro_f1` | 0.42802 |
| `frozen_model_months_6_7.ece` | 0.048946 |

</details>
