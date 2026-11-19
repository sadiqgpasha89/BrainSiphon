# Business Email Compromise Detection: worked example

> Run on synthetic data with `nlp` engine, seed 73106, knobs {"n_docs": 5500}, in 2.0 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect payment-redirect and executive-impersonation emails that contain no malware or links, using relationship and intent signals.

**Constraints that shape the design.** Very few positives; Plain-text attacks; Low false positives on finance mail

**Label in this use case.** For "Business Email Compromise Detection": Detect payment-redirect and executive-impersonation emails that contain no malware or links, using relationship and intent signals. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Few labelled positives from known incidents.

## 2. Choose the signals

Your strongest signal is **First-contact flag with finance role** (sender never emailed this recipient). Its rule: Graph snapshot. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

24.4% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.868 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.460.

## 4. Baseline against the stronger design

The honest evaluation is 0.408 macro-F1 lower than the optimistic one. A frozen model scores 0.780 on the next month and 0.460 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.868 |
| Macro-F1, honest time split | 0.460 |
| Macro-F1, frozen model next month | 0.780 |
| Calibration error, honest split | 0.054 |
| Duplicate share | 24.4% |

## 5. An edge case from the blueprint

**Compromised real vendor account sends the fraud email.** relationship features look legitimate. Planned response: Behaviour-change features on the vendor and invoice anomalies. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 5500 |
| `duplicate_share` | 0.24418 |
| `random_split_with_leak.macro_f1` | 0.8677 |
| `random_split_with_leak.ece` | 0.11153 |
| `time_split_clean.macro_f1` | 0.46001 |
| `time_split_clean.ece` | 0.054402 |
| `frozen_model_next_month.macro_f1` | 0.78007 |
| `frozen_model_next_month.ece` | 0.10165 |
| `frozen_model_months_6_7.macro_f1` | 0.46001 |
| `frozen_model_months_6_7.ece` | 0.054402 |

</details>
