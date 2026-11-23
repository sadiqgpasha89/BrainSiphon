# Security Incident Report Triage: worked example

> Run on synthetic data with `nlp` engine, seed 58850, knobs {"n_docs": 6870}, in 7.7 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Classify and route facility security incident reports by type and severity so serious reports reach managers quickly and trends are visible across sites.

**Constraints that shape the design.** Serious incidents notify a manager within 5 minutes; Names removed from analytics; Multi-label output

**Label in this use case.** For "Security Incident Report Triage": Classify and route facility security incident reports by type and severity so serious reports reach managers quickly and trends are visible across sites. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Outcome-only severity.

## 2. Choose the signals

Your strongest signal is **Incident keywords** (words describing theft, assault or damage). Its rule: From text. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

24.9% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.907 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.484.

## 4. Baseline against the stronger design

The honest evaluation is 0.423 macro-F1 lower than the optimistic one. A frozen model scores 0.821 on the next month and 0.484 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.907 |
| Macro-F1, honest time split | 0.484 |
| Macro-F1, frozen model next month | 0.821 |
| Calibration error, honest split | 0.043 |
| Duplicate share | 24.9% |

## 5. An edge case from the blueprint

**Slang and abbreviations.** the classifier misreads text. Planned response: Lexicon updates. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 6870 |
| `duplicate_share` | 0.24949 |
| `random_split_with_leak.macro_f1` | 0.90733 |
| `random_split_with_leak.ece` | 0.12833 |
| `time_split_clean.macro_f1` | 0.48413 |
| `time_split_clean.ece` | 0.042938 |
| `frozen_model_next_month.macro_f1` | 0.82124 |
| `frozen_model_next_month.ece` | 0.092025 |
| `frozen_model_months_6_7.macro_f1` | 0.48413 |
| `frozen_model_months_6_7.ece` | 0.042938 |

</details>
