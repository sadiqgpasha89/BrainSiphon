# Non-Emergency Call Diversion: worked example

> Run on synthetic data with `nlp` engine, seed 59127, knobs {"n_docs": 4730}, in 5.3 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Identify calls that are not emergencies and offer other channels or services, while ensuring that any doubt goes to a call taker.

**Constraints that shape the design.** Any call that might be an emergency stays with a call taker; Recall of true emergencies above 99.9%; Diversion only with the caller's agreement

**Label in this use case.** For "Non-Emergency Call Diversion": Identify calls that are not emergencies and offer other channels or services, while ensuring that any doubt goes to a call taker. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Forced diversion.

## 2. Choose the signals

Your strongest signal is **Emergency keyword and cue score** (words and tones suggesting danger). Its rule: From speech and text. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

25.2% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.887 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.447.

## 4. Baseline against the stronger design

The honest evaluation is 0.440 macro-F1 lower than the optimistic one. A frozen model scores 0.782 on the next month and 0.447 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.887 |
| Macro-F1, honest time split | 0.447 |
| Macro-F1, frozen model next month | 0.782 |
| Calibration error, honest split | 0.048 |
| Duplicate share | 25.2% |

## 5. An edge case from the blueprint

**Hidden emergency.** the caller understates the danger. Planned response: Conservative thresholds and a person-first policy. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 4730 |
| `duplicate_share` | 0.25159 |
| `random_split_with_leak.macro_f1` | 0.88705 |
| `random_split_with_leak.ece` | 0.13909 |
| `time_split_clean.macro_f1` | 0.44744 |
| `time_split_clean.ece` | 0.048319 |
| `frozen_model_next_month.macro_f1` | 0.78247 |
| `frozen_model_next_month.ece` | 0.12782 |
| `frozen_model_months_6_7.macro_f1` | 0.44744 |
| `frozen_model_months_6_7.ece` | 0.048319 |

</details>
