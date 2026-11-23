# Engineering Document Classification and Control: worked example

> Run on synthetic data with `nlp` engine, seed 28913, knobs {"n_docs": 5480}, in 6.3 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Classify incoming project documents by type, discipline and revision, check metadata against naming rules and route them to the right reviewers and folders.

**Constraints that shape the design.** Low-confidence items go to document controllers; Controlled revisions never overwritten; Metadata checked against naming standards

**Label in this use case.** For "Engineering Document Classification and Control": Classify incoming project documents by type, discipline and revision, check metadata against naming rules and route them to the right reviewers and folders. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: File name as label.

## 2. Choose the signals

Your strongest signal is **Title block and header text** (document number and revision). Its rule: From extraction. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

24.0% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.892 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.469.

## 4. Baseline against the stronger design

The honest evaluation is 0.423 macro-F1 lower than the optimistic one. A frozen model scores 0.830 on the next month and 0.469 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.892 |
| Macro-F1, honest time split | 0.469 |
| Macro-F1, frozen model next month | 0.830 |
| Calibration error, honest split | 0.046 |
| Duplicate share | 24.0% |

## 5. An edge case from the blueprint

**Missing title block.** metadata cannot be read. Planned response: Controller queue. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 5480 |
| `duplicate_share` | 0.2396 |
| `random_split_with_leak.macro_f1` | 0.89204 |
| `random_split_with_leak.ece` | 0.13615 |
| `time_split_clean.macro_f1` | 0.46921 |
| `time_split_clean.ece` | 0.045663 |
| `frozen_model_next_month.macro_f1` | 0.83031 |
| `frozen_model_next_month.ece` | 0.10705 |
| `frozen_model_months_6_7.macro_f1` | 0.46921 |
| `frozen_model_months_6_7.ece` | 0.045663 |

</details>
