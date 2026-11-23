# Phishing Email Detection: worked example

> Run on synthetic data with `nlp` engine, seed 67994, knobs {"n_docs": 6300}, in 8.0 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect phishing and business email compromise in inbound mail from content, sender behaviour and link analysis, quarantining high-confidence cases and reporting the rest to the security team.

**Constraints that shape the design.** Quarantine only at high confidence with user release; Verdict within 2 s of arrival; False quarantines under 1 per 10,000 messages

**Label in this use case.** For "Phishing Email Detection": Detect phishing and business email compromise in inbound mail from content, sender behaviour and link analysis, quarantining high-confidence cases and reporting the rest to the security team. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Spam score as phishing label.

## 2. Choose the signals

Your strongest signal is **Link and domain reputation** (age and reputation of destinations). Its rule: From threat feeds. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

24.8% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.878 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.464.

## 4. Baseline against the stronger design

The honest evaluation is 0.414 macro-F1 lower than the optimistic one. A frozen model scores 0.790 on the next month and 0.464 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.878 |
| Macro-F1, honest time split | 0.464 |
| Macro-F1, frozen model next month | 0.790 |
| Calibration error, honest split | 0.042 |
| Duplicate share | 24.8% |

## 5. An edge case from the blueprint

**Compromised trusted sender.** a known partner account is hijacked. Planned response: Behaviour change signals. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 6300 |
| `duplicate_share` | 0.24762 |
| `random_split_with_leak.macro_f1` | 0.87754 |
| `random_split_with_leak.ece` | 0.1063 |
| `time_split_clean.macro_f1` | 0.46397 |
| `time_split_clean.ece` | 0.042296 |
| `frozen_model_next_month.macro_f1` | 0.79024 |
| `frozen_model_next_month.ece` | 0.0937 |
| `frozen_model_months_6_7.macro_f1` | 0.46397 |
| `frozen_model_months_6_7.ece` | 0.042296 |

</details>
