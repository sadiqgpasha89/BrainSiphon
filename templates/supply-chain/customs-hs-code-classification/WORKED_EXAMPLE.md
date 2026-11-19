# Customs HS-Code Classification: worked example

> Run on synthetic data with `nlp` engine, seed 73778, knobs {"n_docs": 4930}, in 1.8 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Classify goods into Harmonised System codes from descriptions and invoices to accelerate clearance and avoid duties disputes.

**Constraints that shape the design.** 6-10 digit codes by country; Tariff updates annually; Explainability for brokers

**Label in this use case.** For "Customs HS-Code Classification": Classify goods into Harmonised System codes from descriptions and invoices to accelerate clearance and avoid duties disputes. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on past broker mistakes.

## 2. Choose the signals

Your strongest signal is **Hierarchical code probabilities** (per-level probabilities). Its rule: Calibration. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

25.5% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.896 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.480.

## 4. Baseline against the stronger design

The honest evaluation is 0.416 macro-F1 lower than the optimistic one. A frozen model scores 0.774 on the next month and 0.480 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.896 |
| Macro-F1, honest time split | 0.480 |
| Macro-F1, frozen model next month | 0.774 |
| Calibration error, honest split | 0.063 |
| Duplicate share | 25.5% |

## 5. An edge case from the blueprint

**Annual HS revision changes code structure.** codes are renumbered each revision so stale mappings produce wrong classifications. Planned response: Versioned tariff schedules and correspondence tables. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 4930 |
| `duplicate_share` | 0.25497 |
| `random_split_with_leak.macro_f1` | 0.8959 |
| `random_split_with_leak.ece` | 0.11961 |
| `time_split_clean.macro_f1` | 0.47971 |
| `time_split_clean.ece` | 0.063444 |
| `frozen_model_next_month.macro_f1` | 0.77396 |
| `frozen_model_next_month.ece` | 0.10716 |
| `frozen_model_months_6_7.macro_f1` | 0.47971 |
| `frozen_model_months_6_7.ece` | 0.063444 |

</details>
