# Submittal Review Assistant: worked example

> Run on synthetic data with `nlp` engine, seed 79739, knobs {"n_docs": 4630}, in 5.9 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Check contractor submittals such as product data and shop drawings against specifications and drawings and prepare a review note for the reviewing engineer to approve or reject.

**Constraints that shape the design.** Every note cites the specification section; Engineer approves or rejects; Missing items listed

**Label in this use case.** For "Submittal Review Assistant": Check contractor submittals such as product data and shop drawings against specifications and drawings and prepare a review note for the reviewing engineer to approve or reject. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Approval recommendation without evidence.

## 2. Choose the signals

Your strongest signal is **Specified requirements** (values and standards required). Its rule: From specifications. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

25.0% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.904 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.475.

## 4. Baseline against the stronger design

The honest evaluation is 0.429 macro-F1 lower than the optimistic one. A frozen model scores 0.835 on the next month and 0.475 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.904 |
| Macro-F1, honest time split | 0.475 |
| Macro-F1, frozen model next month | 0.835 |
| Calibration error, honest split | 0.055 |
| Duplicate share | 25.0% |

## 5. An edge case from the blueprint

**Equivalent product.** a substitute is proposed. Planned response: Flag for engineer judgement. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 4630 |
| `duplicate_share` | 0.25032 |
| `random_split_with_leak.macro_f1` | 0.90443 |
| `random_split_with_leak.ece` | 0.15236 |
| `time_split_clean.macro_f1` | 0.47525 |
| `time_split_clean.ece` | 0.05474 |
| `frozen_model_next_month.macro_f1` | 0.83491 |
| `frozen_model_next_month.ece` | 0.12957 |
| `frozen_model_months_6_7.macro_f1` | 0.47525 |
| `frozen_model_months_6_7.ece` | 0.05474 |

</details>
