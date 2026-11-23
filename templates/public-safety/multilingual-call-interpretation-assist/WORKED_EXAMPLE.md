# Multilingual Call Interpretation Assist: worked example

> Run on synthetic data with `nlp` engine, seed 6747, knobs {"n_docs": 4700}, in 5.2 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Provide live transcription and translation hints for calls in other languages while a human interpreter is connected, so key facts reach the call taker sooner.

**Constraints that shape the design.** A qualified interpreter is joined for every call in another language; Machine translation is shown only as a hint; Addresses and numbers displayed in the original script

**Label in this use case.** For "Multilingual Call Interpretation Assist": Provide live transcription and translation hints for calls in other languages while a human interpreter is connected, so key facts reach the call taker sooner. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Replacing interpreters.

## 2. Choose the signals

Your strongest signal is **Language identification confidence** (confidence in the language). Its rule: From the classifier. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

24.5% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.888 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.485.

## 4. Baseline against the stronger design

The honest evaluation is 0.404 macro-F1 lower than the optimistic one. A frozen model scores 0.827 on the next month and 0.485 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.888 |
| Macro-F1, honest time split | 0.485 |
| Macro-F1, frozen model next month | 0.827 |
| Calibration error, honest split | 0.057 |
| Duplicate share | 24.5% |

## 5. An edge case from the blueprint

**Dialect.** the speech recogniser fails on the dialect. Planned response: Confidence flags and interpreter only. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 4700 |
| `duplicate_share` | 0.24468 |
| `random_split_with_leak.macro_f1` | 0.88827 |
| `random_split_with_leak.ece` | 0.14597 |
| `time_split_clean.macro_f1` | 0.48464 |
| `time_split_clean.ece` | 0.056985 |
| `frozen_model_next_month.macro_f1` | 0.82739 |
| `frozen_model_next_month.ece` | 0.15553 |
| `frozen_model_months_6_7.macro_f1` | 0.48464 |
| `frozen_model_months_6_7.ece` | 0.056985 |

</details>
