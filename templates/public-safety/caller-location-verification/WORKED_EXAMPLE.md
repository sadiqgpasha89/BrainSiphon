# Caller Location Verification: worked example

> Run on synthetic data with `nlp` engine, seed 56440, knobs {"n_docs": 5630}, in 6.0 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Combine spoken addresses, device location and map data to propose the most likely incident location for the call taker to confirm, and flag conflicts between sources.

**Constraints that shape the design.** Candidate locations within 3 s; The call taker confirms before dispatch; Conflicts shown not hidden

**Label in this use case.** For "Caller Location Verification": Combine spoken addresses, device location and map data to propose the most likely incident location for the call taker to confirm, and flag conflicts between sources. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Single-pin output.

## 2. Choose the signals

Your strongest signal is **Device location accuracy radius** (reported fix and accuracy). Its rule: From the carrier. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

24.4% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.892 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.476.

## 4. Baseline against the stronger design

The honest evaluation is 0.416 macro-F1 lower than the optimistic one. A frozen model scores 0.841 on the next month and 0.476 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.892 |
| Macro-F1, honest time split | 0.476 |
| Macro-F1, frozen model next month | 0.841 |
| Calibration error, honest split | 0.052 |
| Duplicate share | 24.4% |

## 5. An edge case from the blueprint

**Rural address.** the gazetteer is incomplete. Planned response: Landmark matching and a wider uncertainty circle. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 5630 |
| `duplicate_share` | 0.24405 |
| `random_split_with_leak.macro_f1` | 0.89225 |
| `random_split_with_leak.ece` | 0.12804 |
| `time_split_clean.macro_f1` | 0.47587 |
| `time_split_clean.ece` | 0.051627 |
| `frozen_model_next_month.macro_f1` | 0.84121 |
| `frozen_model_next_month.ece` | 0.135 |
| `frozen_model_months_6_7.macro_f1` | 0.47587 |
| `frozen_model_months_6_7.ece` | 0.051627 |

</details>
