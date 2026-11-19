# Short-Answer Grading with LLMs: worked example

> Run on synthetic data with `nlp` engine, seed 41640, knobs {"n_docs": 5150}, in 1.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Grade free-text answers against rubrics with explanations, giving consistent scoring and instant feedback at scale.

**Constraints that shape the design.** Consistency across runs; Rubric-grounded reasoning; Teacher audit

**Label in this use case.** For "Short-Answer Grading with LLMs": Grade free-text answers against rubrics with explanations, giving consistent scoring and instant feedback at scale. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Rubrics too vague to test.

## 2. Choose the signals

Your strongest signal is **Rubric-criterion match** (per-criterion judgment). Its rule: Rubric design. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

24.9% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.896 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.448.

## 4. Baseline against the stronger design

The honest evaluation is 0.448 macro-F1 lower than the optimistic one. A frozen model scores 0.794 on the next month and 0.448 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.896 |
| Macro-F1, honest time split | 0.448 |
| Macro-F1, frozen model next month | 0.794 |
| Calibration error, honest split | 0.052 |
| Duplicate share | 24.9% |

## 5. An edge case from the blueprint

**Unconventional but correct answers.** marked wrong against reference. Planned response: Low-confidence routing and rubric updates. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 5150 |
| `duplicate_share` | 0.24893 |
| `random_split_with_leak.macro_f1` | 0.89629 |
| `random_split_with_leak.ece` | 0.13708 |
| `time_split_clean.macro_f1` | 0.44816 |
| `time_split_clean.ece` | 0.052034 |
| `frozen_model_next_month.macro_f1` | 0.79388 |
| `frozen_model_next_month.ece` | 0.1057 |
| `frozen_model_months_6_7.macro_f1` | 0.44816 |
| `frozen_model_months_6_7.ece` | 0.052034 |

</details>
