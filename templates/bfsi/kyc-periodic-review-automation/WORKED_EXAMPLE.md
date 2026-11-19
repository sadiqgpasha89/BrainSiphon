# KYC Periodic Review Automation & Risk Re-rating: worked example

> Run on synthetic data with `nlp` engine, seed 24671, knobs {"n_docs": 4890}, in 3.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Automate periodic KYC refreshes by checking customer files against fresh data and re-rating risk, escalating changes to analysts.

**Constraints that shape the design.** An analyst decides every change to a high-risk rating; Every check and its source logged with a timestamp; Review frequency set by risk tier

**Label in this use case.** For "KYC Periodic Review Automation & Risk Re-rating": Automate periodic KYC refreshes by checking customer files against fresh data and re-rating risk, escalating changes to analysts. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels come from past analyst decisions, so the model repeats earlier habits.

## 2. Choose the signals

Your strongest signal is **Ownership change** (change in beneficial ownership recorded in a company registry since the last review). Its rule: Registries update late. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

24.4% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.869 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.461.

## 4. Baseline against the stronger design

The honest evaluation is 0.408 macro-F1 lower than the optimistic one. A frozen model scores 0.786 on the next month and 0.461 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.869 |
| Macro-F1, honest time split | 0.461 |
| Macro-F1, frozen model next month | 0.786 |
| Calibration error, honest split | 0.048 |
| Duplicate share | 24.4% |

## 5. An edge case from the blueprint

**Registry delay.** A registry updates late so the review checks outdated ownership data. Planned response: Show the source date for each check and re-run when the registry refreshes. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 4890 |
| `duplicate_share` | 0.24397 |
| `random_split_with_leak.macro_f1` | 0.86923 |
| `random_split_with_leak.ece` | 0.13289 |
| `time_split_clean.macro_f1` | 0.46143 |
| `time_split_clean.ece` | 0.04797 |
| `frozen_model_next_month.macro_f1` | 0.78609 |
| `frozen_model_next_month.ece` | 0.11547 |
| `frozen_model_months_6_7.macro_f1` | 0.46143 |
| `frozen_model_months_6_7.ece` | 0.04797 |

</details>
