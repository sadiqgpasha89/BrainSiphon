# Patient Safety Incident Prioritization: worked example

> Run on synthetic data with `nlp` engine, seed 60376, knobs {"n_docs": 6950}, in 17.0 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Triage patient-safety incident reports by potential severity, urgency, recurrence and required review pathway, so safety professionals open the highest-risk reports first and mandatory escalations are never delayed.

**Constraints that shape the design.** Deterministic escalation rules for sentinel and never events run first and always override the model; Safety professionals determine final severity and reporting obligations; The model suggests priority and routing and states what information is missing

**Label in this use case.** For "Patient Safety Incident Prioritization": Triage patient-safety incident reports by potential severity, urgency, recurrence and required review pathway, so safety professionals open the highest-risk reports first and mandatory escalations are never delayed. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on reporter-assigned severity.

## 2. Choose the signals

Your strongest signal is **Narrative risk phrases** (model-extracted harm, equipment, medication and escalation cues). Its rule: Redacted text as at report time. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

24.8% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.912 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.461.

## 4. Baseline against the stronger design

The honest evaluation is 0.451 macro-F1 lower than the optimistic one. A frozen model scores 0.815 on the next month and 0.461 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.912 |
| Macro-F1, honest time split | 0.461 |
| Macro-F1, frozen model next month | 0.815 |
| Calibration error, honest split | 0.048 |
| Duplicate share | 24.8% |

## 5. An edge case from the blueprint

**New event type not in the taxonomy.** classifier mislabels. Planned response: Out-of-vocabulary detector and a manual route. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 6950 |
| `duplicate_share` | 0.24777 |
| `random_split_with_leak.macro_f1` | 0.91205 |
| `random_split_with_leak.ece` | 0.1113 |
| `time_split_clean.macro_f1` | 0.46065 |
| `time_split_clean.ece` | 0.047724 |
| `frozen_model_next_month.macro_f1` | 0.8147 |
| `frozen_model_next_month.ece` | 0.079999 |
| `frozen_model_months_6_7.macro_f1` | 0.46065 |
| `frozen_model_months_6_7.ece` | 0.047724 |

</details>
