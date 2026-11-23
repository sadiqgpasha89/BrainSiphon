# Secret Detection in Code and Logs: worked example

> Run on synthetic data with `nlp` engine, seed 62790, knobs {"n_docs": 5090}, in 5.3 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect API keys, tokens and credentials in commits, logs and chat before they spread, block pushes and start rotation with the owner.

**Constraints that shape the design.** Block high-confidence secrets at push within 2 s; Rotation ticket created automatically; False blocks under 1 per 1,000 pushes

**Label in this use case.** For "Secret Detection in Code and Logs": Detect API keys, tokens and credentials in commits, logs and chat before they spread, block pushes and start rotation with the owner. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Raw secrets in findings.

## 2. Choose the signals

Your strongest signal is **Pattern and entropy match** (format and randomness of the string). Its rule: From scanners. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

26.4% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.888 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.439.

## 4. Baseline against the stronger design

The honest evaluation is 0.449 macro-F1 lower than the optimistic one. A frozen model scores 0.746 on the next month and 0.439 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.888 |
| Macro-F1, honest time split | 0.439 |
| Macro-F1, frozen model next month | 0.746 |
| Calibration error, honest split | 0.044 |
| Duplicate share | 26.4% |

## 5. An edge case from the blueprint

**Test credentials.** strings look like secrets. Planned response: Allow-lists with expiry. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 5090 |
| `duplicate_share` | 0.26365 |
| `random_split_with_leak.macro_f1` | 0.88753 |
| `random_split_with_leak.ece` | 0.13098 |
| `time_split_clean.macro_f1` | 0.43883 |
| `time_split_clean.ece` | 0.04434 |
| `frozen_model_next_month.macro_f1` | 0.74594 |
| `frozen_model_next_month.ece` | 0.072455 |
| `frozen_model_months_6_7.macro_f1` | 0.43883 |
| `frozen_model_months_6_7.ece` | 0.04434 |

</details>
