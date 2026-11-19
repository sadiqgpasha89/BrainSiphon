# Patient Portal Message Triage & Drafts: worked example

> Run on synthetic data with `nlp` engine, seed 55899, knobs {"n_docs": 6370}, in 2.1 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Classify urgency and route inbound patient messages, drafting safe replies for staff review to cut inbox burden.

**Constraints that shape the design.** Never auto-reply to urgent clinical questions; Staff approval; PHI controls

**Label in this use case.** For "Patient Portal Message Triage & Drafts": Classify urgency and route inbound patient messages, drafting safe replies for staff review to cut inbox burden. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training labels from inconsistent triage.

## 2. Choose the signals

Your strongest signal is **Red-flag phrase detection** (symptom red-flag matching). Its rule: Curated list. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

25.1% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.862 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.434.

## 4. Baseline against the stronger design

The honest evaluation is 0.428 macro-F1 lower than the optimistic one. A frozen model scores 0.718 on the next month and 0.434 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.862 |
| Macro-F1, honest time split | 0.434 |
| Macro-F1, frozen model next month | 0.718 |
| Calibration error, honest split | 0.043 |
| Duplicate share | 25.1% |

## 5. An edge case from the blueprint

**Message contains multiple intents.** one intent ignored. Planned response: Multi-label intent detection and split routing. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 6370 |
| `duplicate_share` | 0.25055 |
| `random_split_with_leak.macro_f1` | 0.86176 |
| `random_split_with_leak.ece` | 0.1094 |
| `time_split_clean.macro_f1` | 0.43384 |
| `time_split_clean.ece` | 0.042842 |
| `frozen_model_next_month.macro_f1` | 0.71781 |
| `frozen_model_next_month.ece` | 0.094439 |
| `frozen_model_months_6_7.macro_f1` | 0.43384 |
| `frozen_model_months_6_7.ece` | 0.042842 |

</details>
