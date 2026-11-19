# DNS Tunnelling & DGA Detection: worked example

> Run on synthetic data with `nlp` engine, seed 85280, knobs {"n_docs": 5920}, in 2.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect data exfiltration over DNS and algorithmically generated domains used by malware, at resolver scale.

**Constraints that shape the design.** Billions of queries per day; Under 1 ms per query; Very low false positives

**Label in this use case.** For "DNS Tunnelling & DGA Detection": Detect data exfiltration over DNS and algorithmically generated domains used by malware, at resolver scale. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Benign data from popularity lists with CDN gaps.

## 2. Choose the signals

Your strongest signal is **Subdomain entropy and length** (Shannon entropy of labels). Its rule: Language effects. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

25.7% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.916 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.491.

## 4. Baseline against the stronger design

The honest evaluation is 0.425 macro-F1 lower than the optimistic one. A frozen model scores 0.819 on the next month and 0.491 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.916 |
| Macro-F1, honest time split | 0.491 |
| Macro-F1, frozen model next month | 0.819 |
| Calibration error, honest split | 0.070 |
| Duplicate share | 25.7% |

## 5. An edge case from the blueprint

**CDN and cloud services use random-looking subdomains.** false positives on legitimate traffic. Planned response: Known-service allow-lists and structural patterns. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 5920 |
| `duplicate_share` | 0.25726 |
| `random_split_with_leak.macro_f1` | 0.91632 |
| `random_split_with_leak.ece` | 0.12349 |
| `time_split_clean.macro_f1` | 0.49142 |
| `time_split_clean.ece` | 0.070419 |
| `frozen_model_next_month.macro_f1` | 0.81895 |
| `frozen_model_next_month.ece` | 0.1094 |
| `frozen_model_months_6_7.macro_f1` | 0.49142 |
| `frozen_model_months_6_7.ece` | 0.070419 |

</details>
