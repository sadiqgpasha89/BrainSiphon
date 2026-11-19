# Malicious Open-Source Package Detection: worked example

> Run on synthetic data with `nlp` engine, seed 90475, knobs {"n_docs": 4580}, in 2.8 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect malicious packages (typosquats, install-script malware, dependency confusion) in package registries and CI before they run.

**Constraints that shape the design.** Millions of packages; New versions published constantly; Low false positives for maintainers

**Label in this use case.** For "Malicious Open-Source Package Detection": Detect malicious packages (typosquats, install-script malware, dependency confusion) in package registries and CI before they run. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Test set made of known blocklists.

## 2. Choose the signals

Your strongest signal is **Install-script risk** (network or exec calls in install hooks). Its rule: Static analysis. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

24.7% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.874 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.464.

## 4. Baseline against the stronger design

The honest evaluation is 0.410 macro-F1 lower than the optimistic one. A frozen model scores 0.821 on the next month and 0.464 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.874 |
| Macro-F1, honest time split | 0.464 |
| Macro-F1, frozen model next month | 0.821 |
| Calibration error, honest split | 0.052 |
| Duplicate share | 24.7% |

## 5. An edge case from the blueprint

**Legitimate package adds a postinstall script.** flagged as malware. Planned response: Maintainer reputation weighting and reviewer fast path. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 4580 |
| `duplicate_share` | 0.24694 |
| `random_split_with_leak.macro_f1` | 0.8739 |
| `random_split_with_leak.ece` | 0.13871 |
| `time_split_clean.macro_f1` | 0.46427 |
| `time_split_clean.ece` | 0.052457 |
| `frozen_model_next_month.macro_f1` | 0.8207 |
| `frozen_model_next_month.ece` | 0.13142 |
| `frozen_model_months_6_7.macro_f1` | 0.46427 |
| `frozen_model_months_6_7.ece` | 0.052457 |

</details>
