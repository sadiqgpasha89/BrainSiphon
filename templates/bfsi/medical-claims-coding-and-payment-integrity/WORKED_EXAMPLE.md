# Medical Claims Coding & Payment Integrity: worked example

> Run on synthetic data with `nlp` engine, seed 62066, knobs {"n_docs": 6320}, in 4.1 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Check submitted health claims for coding errors, unbundling and duplicate billing before payment.

**Constraints that shape the design.** Providers can appeal; Edits follow published rules; Reviewers see rule or evidence

**Label in this use case.** For "Medical Claims Coding & Payment Integrity": Check submitted health claims for coding errors, unbundling and duplicate billing before payment. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Reviewed claims only.

## 2. Choose the signals

Your strongest signal is **Code pair conflict** (procedure pairs that should not bill together). Its rule: Rule version. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

25.6% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.902 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.456.

## 4. Baseline against the stronger design

The honest evaluation is 0.446 macro-F1 lower than the optimistic one. A frozen model scores 0.827 on the next month and 0.456 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.902 |
| Macro-F1, honest time split | 0.456 |
| Macro-F1, frozen model next month | 0.827 |
| Calibration error, honest split | 0.061 |
| Duplicate share | 25.6% |

## 5. An edge case from the blueprint

**New code set.** A new code set year changes procedure and diagnosis codes and old rules misfire. Planned response: Track rule updates by effective date and re-test the model on the new code set before go-live. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 6320 |
| `duplicate_share` | 0.25617 |
| `random_split_with_leak.macro_f1` | 0.90196 |
| `random_split_with_leak.ece` | 0.10564 |
| `time_split_clean.macro_f1` | 0.45552 |
| `time_split_clean.ece` | 0.060815 |
| `frozen_model_next_month.macro_f1` | 0.82747 |
| `frozen_model_next_month.ece` | 0.098425 |
| `frozen_model_months_6_7.macro_f1` | 0.45552 |
| `frozen_model_months_6_7.ece` | 0.060815 |

</details>
