# Clinical Communication Urgency Classification: worked example

> Run on synthetic data with `nlp` engine, seed 51760, knobs {"n_docs": 6470}, in 13.9 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Classify incoming clinical and operational messages by urgency and the response pathway they need, so the right queue sees them first, while deterministic emergency rules and existing escalation protocols stay in force.

**Constraints that shape the design.** This is not an emergency triage tool and urgent messages follow the existing escalation protocols whatever the model says; Deterministic emergency keywords and rules run first and the model can only raise urgency never lower it below the rules; Conservative thresholds and an abstain route send uncertain messages to a person

**Label in this use case.** For "Clinical Communication Urgency Classification": Classify incoming clinical and operational messages by urgency and the response pathway they need, so the right queue sees them first, while deterministic emergency rules and existing escalation protocols stay in force. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on arrival-order labels.

## 2. Choose the signals

Your strongest signal is **Urgency cue terms and phrases** (clinical and operational language that signals urgency in context). Its rule: Message text. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

23.9% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.901 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.467.

## 4. Baseline against the stronger design

The honest evaluation is 0.434 macro-F1 lower than the optimistic one. A frozen model scores 0.763 on the next month and 0.467 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.901 |
| Macro-F1, honest time split | 0.467 |
| Macro-F1, frozen model next month | 0.763 |
| Calibration error, honest split | 0.041 |
| Duplicate share | 23.9% |

## 5. An edge case from the blueprint

**Abbreviations and slang.** the classifier misreads. Planned response: Local lexicon and abstention. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 6470 |
| `duplicate_share` | 0.23895 |
| `random_split_with_leak.macro_f1` | 0.9009 |
| `random_split_with_leak.ece` | 0.11772 |
| `time_split_clean.macro_f1` | 0.46678 |
| `time_split_clean.ece` | 0.041044 |
| `frozen_model_next_month.macro_f1` | 0.76317 |
| `frozen_model_next_month.ece` | 0.076038 |
| `frozen_model_months_6_7.macro_f1` | 0.46678 |
| `frozen_model_months_6_7.ece` | 0.041044 |

</details>
