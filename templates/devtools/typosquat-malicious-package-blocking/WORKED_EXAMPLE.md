# Malicious Package Detection: worked example

> Run on synthetic data with `nlp` engine, seed 18635, knobs {"n_docs": 5450}, in 4.4 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect suspicious new package versions in registries and in build dependencies, such as typosquats and install-time scripts that fetch payloads, and block them before they enter builds.

**Constraints that shape the design.** Block high-confidence malicious packages at the proxy; Analyst reviews borderline cases; Allow-list for trusted publishers

**Label in this use case.** For "Malicious Package Detection": Detect suspicious new package versions in registries and in build dependencies, such as typosquats and install-time scripts that fetch payloads, and block them before they enter builds. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Known-vulnerability scanning only.

## 2. Choose the signals

Your strongest signal is **Name similarity to popular packages** (typosquat distance). Its rule: From the registry. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

24.9% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.888 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.432.

## 4. Baseline against the stronger design

The honest evaluation is 0.456 macro-F1 lower than the optimistic one. A frozen model scores 0.788 on the next month and 0.432 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.888 |
| Macro-F1, honest time split | 0.432 |
| Macro-F1, frozen model next month | 0.788 |
| Calibration error, honest split | 0.030 |
| Duplicate share | 24.9% |

## 5. An edge case from the blueprint

**Legitimate obfuscation.** a build tool obfuscates code. Planned response: Publisher trust and allow-lists. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 5450 |
| `duplicate_share` | 0.24862 |
| `random_split_with_leak.macro_f1` | 0.88767 |
| `random_split_with_leak.ece` | 0.12199 |
| `time_split_clean.macro_f1` | 0.43204 |
| `time_split_clean.ece` | 0.030185 |
| `frozen_model_next_month.macro_f1` | 0.78775 |
| `frozen_model_next_month.ece` | 0.12162 |
| `frozen_model_months_6_7.macro_f1` | 0.43204 |
| `frozen_model_months_6_7.ece` | 0.030185 |

</details>
