# Secret & Credential Leak Detection in Code: worked example

> Run on synthetic data with `nlp` engine, seed 20556, knobs {"n_docs": 6330}, in 2.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Find API keys, tokens and credentials in commits and repos with high precision to prevent leaks before merge.

**Constraints that shape the design.** Pre-commit latency under 1 s; Millions of repos; Very few false positives (developer trust)

**Label in this use case.** For "Secret & Credential Leak Detection in Code": Find API keys, tokens and credentials in commits and repos with high precision to prevent leaks before merge. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Positives from synthetic keys.

## 2. Choose the signals

Your strongest signal is **Pattern match for provider format** (key prefix and checksum). Its rule: Format updates. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

25.1% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.897 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.453.

## 4. Baseline against the stronger design

The honest evaluation is 0.444 macro-F1 lower than the optimistic one. A frozen model scores 0.798 on the next month and 0.453 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.897 |
| Macro-F1, honest time split | 0.453 |
| Macro-F1, frozen model next month | 0.798 |
| Calibration error, honest split | 0.038 |
| Duplicate share | 25.1% |

## 5. An edge case from the blueprint

**Test fixtures contain fake keys.** fake keys in test fixtures trigger repeated alerts and cause developers to ignore the scanner. Planned response: Fixture path rules and verification of validity. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 6330 |
| `duplicate_share` | 0.25118 |
| `random_split_with_leak.macro_f1` | 0.89723 |
| `random_split_with_leak.ece` | 0.12732 |
| `time_split_clean.macro_f1` | 0.45283 |
| `time_split_clean.ece` | 0.038165 |
| `frozen_model_next_month.macro_f1` | 0.79789 |
| `frozen_model_next_month.ece` | 0.086222 |
| `frozen_model_months_6_7.macro_f1` | 0.45283 |
| `frozen_model_months_6_7.ece` | 0.038165 |

</details>
