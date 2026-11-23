# Official Notice Translation Review: worked example

> Run on synthetic data with `nlp` engine, seed 60715, knobs {"n_docs": 5250}, in 6.9 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Translate official notices and letters into residents' languages and flag meaning drift for a reviewer so the text stays accurate and readable.

**Constraints that shape the design.** Reviewer approves legal or rights-related notices; Key terms follow an approved glossary; Original and translation stored together

**Label in this use case.** For "Official Notice Translation Review": Translate official notices and letters into residents' languages and flag meaning drift for a reviewer so the text stays accurate and readable. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Fluency as the metric.

## 2. Choose the signals

Your strongest signal is **Glossary term match** (whether key terms follow the glossary). Its rule: From the glossary. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

24.6% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.868 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.438.

## 4. Baseline against the stronger design

The honest evaluation is 0.430 macro-F1 lower than the optimistic one. A frozen model scores 0.794 on the next month and 0.438 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.868 |
| Macro-F1, honest time split | 0.438 |
| Macro-F1, frozen model next month | 0.794 |
| Calibration error, honest split | 0.029 |
| Duplicate share | 24.6% |

## 5. An edge case from the blueprint

**Rare language.** the model is weak. Planned response: Routing to human translators. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 5250 |
| `duplicate_share` | 0.2459 |
| `random_split_with_leak.macro_f1` | 0.86825 |
| `random_split_with_leak.ece` | 0.128 |
| `time_split_clean.macro_f1` | 0.43838 |
| `time_split_clean.ece` | 0.02889 |
| `frozen_model_next_month.macro_f1` | 0.79396 |
| `frozen_model_next_month.ece` | 0.095806 |
| `frozen_model_months_6_7.macro_f1` | 0.43838 |
| `frozen_model_months_6_7.ece` | 0.02889 |

</details>
