# Phishing URL & Email Detection: worked example

> Run on synthetic data with `nlp` engine, seed 78655, knobs {"n_docs": 6110}, in 4.0 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Block phishing emails and links at delivery and click time, catching novel campaigns before blocklists update.

**Constraints that shape the design.** Delivery latency under 100 ms; Zero tolerance for blocking business-critical mail; Multilingual

**Label in this use case.** For "Phishing URL & Email Detection": Block phishing emails and links at delivery and click time, catching novel campaigns before blocklists update. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on old campaigns.

## 2. Choose the signals

Your strongest signal is **Domain age and registration pattern** (days since registration, registrar risk). Its rule: WHOIS timing. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

24.9% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.908 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.445.

## 4. Baseline against the stronger design

The honest evaluation is 0.463 macro-F1 lower than the optimistic one. A frozen model scores 0.873 on the next month and 0.445 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.908 |
| Macro-F1, honest time split | 0.445 |
| Macro-F1, frozen model next month | 0.873 |
| Calibration error, honest split | 0.034 |
| Duplicate share | 24.9% |

## 5. An edge case from the blueprint

**Legitimate marketing mail from a new domain.** false positive blocks a critical vendor. Planned response: Allow-list workflow and sender reputation ramp. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 6110 |
| `duplicate_share` | 0.24861 |
| `random_split_with_leak.macro_f1` | 0.90803 |
| `random_split_with_leak.ece` | 0.10935 |
| `time_split_clean.macro_f1` | 0.4452 |
| `time_split_clean.ece` | 0.033845 |
| `frozen_model_next_month.macro_f1` | 0.87328 |
| `frozen_model_next_month.ece` | 0.12292 |
| `frozen_model_months_6_7.macro_f1` | 0.4452 |
| `frozen_model_months_6_7.ece` | 0.033845 |

</details>
