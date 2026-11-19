# Transaction Categorisation & Merchant Enrichment: worked example

> Run on synthetic data with `nlp` engine, seed 60579, knobs {"n_docs": 6530}, in 4.1 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Assign accurate spend categories and clean merchant names to every transaction in real time so budgeting and insights are trustworthy.

**Constraints that shape the design.** 99% availability; Under 40 ms per transaction; Multi-lingual messy descriptors

**Label in this use case.** For "Transaction Categorisation & Merchant Enrichment": Assign accurate spend categories and clean merchant names to every transaction in real time so budgeting and insights are trustworthy. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Test split by transaction not by merchant.

## 2. Choose the signals

Your strongest signal is **Normalised merchant ID** (resolved merchant from alias dictionary and embedding). Its rule: Resolution table versioned. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

25.8% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.910 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.466.

## 4. Baseline against the stronger design

The honest evaluation is 0.443 macro-F1 lower than the optimistic one. A frozen model scores 0.854 on the next month and 0.466 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.910 |
| Macro-F1, honest time split | 0.466 |
| Macro-F1, frozen model next month | 0.854 |
| Calibration error, honest split | 0.047 |
| Duplicate share | 25.8% |

## 5. An edge case from the blueprint

**New merchant never seen.** classified wrongly with high confidence. Planned response: Open-set threshold routes to nearest-neighbour plus review. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 6530 |
| `duplicate_share` | 0.25804 |
| `random_split_with_leak.macro_f1` | 0.9096 |
| `random_split_with_leak.ece` | 0.13031 |
| `time_split_clean.macro_f1` | 0.46645 |
| `time_split_clean.ece` | 0.046634 |
| `frozen_model_next_month.macro_f1` | 0.85444 |
| `frozen_model_next_month.ece` | 0.12235 |
| `frozen_model_months_6_7.macro_f1` | 0.46645 |
| `frozen_model_months_6_7.ece` | 0.046634 |

</details>
