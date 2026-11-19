# Email Subject Line & Send Optimisation: worked example

> Run on synthetic data with `nlp` engine, seed 74029, knobs {"n_docs": 6850}, in 2.1 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Choose subject lines that lift real engagement and conversions rather than opens inflated by privacy features.

**Constraints that shape the design.** Brand and compliance; Open-rate measurement distortions; Consent

**Label in this use case.** For "Email Subject Line & Send Optimisation": Choose subject lines that lift real engagement and conversions rather than opens inflated by privacy features. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on opens.

## 2. Choose the signals

Your strongest signal is **Subject embedding features** (semantic embedding of subject). Its rule: Encoder. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

24.9% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.914 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.441.

## 4. Baseline against the stronger design

The honest evaluation is 0.473 macro-F1 lower than the optimistic one. A frozen model scores 0.805 on the next month and 0.441 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.914 |
| Macro-F1, honest time split | 0.441 |
| Macro-F1, frozen model next month | 0.805 |
| Calibration error, honest split | 0.048 |
| Duplicate share | 24.9% |

## 5. An edge case from the blueprint

**Auto-opens inflate engagement for one segment.** bandit favours wrong subjects. Planned response: Use click-based rewards and bot-open filtering. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 6850 |
| `duplicate_share` | 0.24861 |
| `random_split_with_leak.macro_f1` | 0.91424 |
| `random_split_with_leak.ece` | 0.12355 |
| `time_split_clean.macro_f1` | 0.44125 |
| `time_split_clean.ece` | 0.047541 |
| `frozen_model_next_month.macro_f1` | 0.80507 |
| `frozen_model_next_month.ece` | 0.08914 |
| `frozen_model_months_6_7.macro_f1` | 0.44125 |
| `frozen_model_months_6_7.ece` | 0.047541 |

</details>
