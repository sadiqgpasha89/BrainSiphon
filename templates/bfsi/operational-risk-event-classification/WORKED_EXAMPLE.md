# Operational Risk Event Classification & Loss Forecasting: worked example

> Run on synthetic data with `nlp` engine, seed 12618, knobs {"n_docs": 6070}, in 4.1 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Classify incident reports into the operational risk taxonomy and forecast loss severity so controls and capital reflect real event patterns.

**Constraints that shape the design.** Basel event types and business lines mapped; Reviewer sign-off on high-severity events; Reports retained under policy

**Label in this use case.** For "Operational Risk Event Classification & Loss Forecasting": Classify incident reports into the operational risk taxonomy and forecast loss severity so controls and capital reflect real event patterns. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels reflect the first classification, not the final one.

## 2. Choose the signals

Your strongest signal is **Text embedding of the report** (encoder over the narrative). Its rule: Reports vary in quality. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

25.4% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.907 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.457.

## 4. Baseline against the stronger design

The honest evaluation is 0.449 macro-F1 lower than the optimistic one. A frozen model scores 0.802 on the next month and 0.457 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.907 |
| Macro-F1, honest time split | 0.457 |
| Macro-F1, frozen model next month | 0.802 |
| Calibration error, honest split | 0.052 |
| Duplicate share | 25.4% |

## 5. An edge case from the blueprint

**Novel event type.** A new kind of loss event does not fit the existing taxonomy and is forced into a wrong class. Planned response: Flag out-of-distribution events for review and propose a new taxonomy entry to the risk owner. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 6070 |
| `duplicate_share` | 0.25354 |
| `random_split_with_leak.macro_f1` | 0.90655 |
| `random_split_with_leak.ece` | 0.12376 |
| `time_split_clean.macro_f1` | 0.45722 |
| `time_split_clean.ece` | 0.052354 |
| `frozen_model_next_month.macro_f1` | 0.802 |
| `frozen_model_next_month.ece` | 0.1028 |
| `frozen_model_months_6_7.macro_f1` | 0.45722 |
| `frozen_model_months_6_7.ece` | 0.052354 |

</details>
