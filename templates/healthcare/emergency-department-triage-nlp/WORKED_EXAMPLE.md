# ED Triage Acuity Assistant: worked example

> Run on synthetic data with `nlp` engine, seed 55172, knobs {"n_docs": 6490}, in 2.3 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Suggest ESI acuity levels from triage notes, vitals and history to reduce under-triage and variability between nurses.

**Constraints that shape the design.** Asymmetric cost (under-triage is worse); Nurse override always available; Latency under 2 s

**Label in this use case.** For "ED Triage Acuity Assistant": Suggest ESI acuity levels from triage notes, vitals and history to reduce under-triage and variability between nurses. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels reflect nurse biases.

## 2. Choose the signals

Your strongest signal is **Vital-sign abnormality count** (number of out-of-range vitals). Its rule: Age-adjusted ranges. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

24.9% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.899 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.439.

## 4. Baseline against the stronger design

The honest evaluation is 0.461 macro-F1 lower than the optimistic one. A frozen model scores 0.809 on the next month and 0.439 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.899 |
| Macro-F1, honest time split | 0.439 |
| Macro-F1, frozen model next month | 0.809 |
| Calibration error, honest split | 0.037 |
| Duplicate share | 24.9% |

## 5. An edge case from the blueprint

**Atypical presentation in women or elderly.** atypical symptom descriptions under-triage these patients relative to classic presentations. Planned response: Subgroup performance monitoring and targeted data. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 6490 |
| `duplicate_share` | 0.24931 |
| `random_split_with_leak.macro_f1` | 0.89937 |
| `random_split_with_leak.ece` | 0.12194 |
| `time_split_clean.macro_f1` | 0.43879 |
| `time_split_clean.ece` | 0.037051 |
| `frozen_model_next_month.macro_f1` | 0.80934 |
| `frozen_model_next_month.ece` | 0.10131 |
| `frozen_model_months_6_7.macro_f1` | 0.43879 |
| `frozen_model_months_6_7.ece` | 0.037051 |

</details>
