# Scam Report Triage: worked example

> Run on synthetic data with `nlp` engine, seed 67309, knobs {"n_docs": 6380}, in 7.2 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Cluster and prioritise scam reports from the public by type, amount and links between reports so investigators find campaigns and victims get the right support.

**Constraints that shape the design.** Victim support information given at once; Campaign clusters shown to investigators; Names removed from analysis

**Label in this use case.** For "Scam Report Triage": Cluster and prioritise scam reports from the public by type, amount and links between reports so investigators find campaigns and victims get the right support. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Reports in isolation.

## 2. Choose the signals

Your strongest signal is **Scam type cues** (romance, investment or impersonation). Its rule: From text. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

25.3% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.870 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.418.

## 4. Baseline against the stronger design

The honest evaluation is 0.452 macro-F1 lower than the optimistic one. A frozen model scores 0.800 on the next month and 0.418 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.870 |
| Macro-F1, honest time split | 0.418 |
| Macro-F1, frozen model next month | 0.800 |
| Calibration error, honest split | 0.042 |
| Duplicate share | 25.3% |

## 5. An edge case from the blueprint

**Mixed scams.** a report has several types. Planned response: Multi-label routing. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 6380 |
| `duplicate_share` | 0.25251 |
| `random_split_with_leak.macro_f1` | 0.86973 |
| `random_split_with_leak.ece` | 0.11217 |
| `time_split_clean.macro_f1` | 0.41779 |
| `time_split_clean.ece` | 0.042239 |
| `frozen_model_next_month.macro_f1` | 0.79983 |
| `frozen_model_next_month.ece` | 0.084058 |
| `frozen_model_months_6_7.macro_f1` | 0.41779 |
| `frozen_model_months_6_7.ece` | 0.042239 |

</details>
