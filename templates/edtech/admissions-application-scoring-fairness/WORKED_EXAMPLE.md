# Admissions Application Scoring with Fairness Controls: worked example

> Run on synthetic data with `nlp` engine, seed 82630, knobs {"n_docs": 5250}, in 1.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Support holistic review by summarising applications and flagging evidence, with strict fairness controls and no automated decisions.

**Constraints that shape the design.** Legal compliance on protected attributes; Human decision-making; Transparency to applicants

**Label in this use case.** For "Admissions Application Scoring with Fairness Controls": Support holistic review by summarising applications and flagging evidence, with strict fairness controls and no automated decisions. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on past admissions decisions.

## 2. Choose the signals

Your strongest signal is **Structured evidence summary** (extracted achievements and context). Its rule: Extraction accuracy. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

25.5% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.906 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.444.

## 4. Baseline against the stronger design

The honest evaluation is 0.462 macro-F1 lower than the optimistic one. A frozen model scores 0.791 on the next month and 0.444 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.906 |
| Macro-F1, honest time split | 0.444 |
| Macro-F1, frozen model next month | 0.791 |
| Calibration error, honest split | 0.055 |
| Duplicate share | 25.5% |

## 5. An edge case from the blueprint

**Historical admits encode past bias.** model replicates bias. Planned response: Do not train on historical decisions; use rubric-based evidence only. Write the test that replays this case through your pipeline before you tune anything.

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
| `duplicate_share` | 0.25543 |
| `random_split_with_leak.macro_f1` | 0.90597 |
| `random_split_with_leak.ece` | 0.15527 |
| `time_split_clean.macro_f1` | 0.444 |
| `time_split_clean.ece` | 0.055351 |
| `frozen_model_next_month.macro_f1` | 0.79141 |
| `frozen_model_next_month.ece` | 0.10203 |
| `frozen_model_months_6_7.macro_f1` | 0.444 |
| `frozen_model_months_6_7.ece` | 0.055351 |

</details>
