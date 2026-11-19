# Child-Safe Content Filtering: worked example

> Run on synthetic data with `nlp` engine, seed 59928, knobs {"n_docs": 6990}, in 4.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Filter text, images and chat in learning environments for age-inappropriate and unsafe content, with low over-blocking of educational material.

**Constraints that shape the design.** Age bands; Legal compliance (COPPA, GDPR-K); Educational context (biology, history)

**Label in this use case.** For "Child-Safe Content Filtering": Filter text, images and chat in learning environments for age-inappropriate and unsafe content, with low over-blocking of educational material. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Test data without educational content.

## 2. Choose the signals

Your strongest signal is **Category scores by age band** (age-conditioned policy). Its rule: Policy definition. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

24.9% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.919 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.489.

## 4. Baseline against the stronger design

The honest evaluation is 0.430 macro-F1 lower than the optimistic one. A frozen model scores 0.839 on the next month and 0.489 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.919 |
| Macro-F1, honest time split | 0.489 |
| Macro-F1, frozen model next month | 0.839 |
| Calibration error, honest split | 0.050 |
| Duplicate share | 24.9% |

## 5. An edge case from the blueprint

**Medical biology textbook flagged.** learning blocked. Planned response: Educational-source allow-lists and context scoring. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 6990 |
| `duplicate_share` | 0.24936 |
| `random_split_with_leak.macro_f1` | 0.9191 |
| `random_split_with_leak.ece` | 0.12352 |
| `time_split_clean.macro_f1` | 0.48927 |
| `time_split_clean.ece` | 0.04972 |
| `frozen_model_next_month.macro_f1` | 0.83858 |
| `frozen_model_next_month.ece` | 0.10995 |
| `frozen_model_months_6_7.macro_f1` | 0.48927 |
| `frozen_model_months_6_7.ece` | 0.04972 |

</details>
