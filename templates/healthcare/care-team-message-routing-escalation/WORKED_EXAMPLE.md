# Care-Team Message Routing & Escalation: worked example

> Run on synthetic data with `nlp` engine, seed 28783, knobs {"n_docs": 6950}, in 15.0 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Recommend the correct role or team for a message using specialty, location, patient-care relationship, on-call roster and escalation policy, with a fallback route, an acknowledgement timer and a defined escalation chain.

**Constraints that shape the design.** The sender can correct any routing and the platform keeps every acknowledgement and escalation in an audit trail; Deterministic routing rules and the on-call roster decide the recipient and the model only classifies intent; An unacknowledged message follows the approved escalation chain on its timer

**Label in this use case.** For "Care-Team Message Routing & Escalation": Recommend the correct role or team for a message using specialty, location, patient-care relationship, on-call roster and escalation policy, with a fallback route, an acknowledgement timer and a defined escalation chain. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Letting the model pick the recipient.

## 2. Choose the signals

Your strongest signal is **Intent class** (classified request type such as medication question, result follow-up or logistics). Its rule: Message text. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

25.2% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.906 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.510.

## 4. Baseline against the stronger design

The honest evaluation is 0.396 macro-F1 lower than the optimistic one. A frozen model scores 0.837 on the next month and 0.510 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.906 |
| Macro-F1, honest time split | 0.510 |
| Macro-F1, frozen model next month | 0.837 |
| Calibration error, honest split | 0.053 |
| Duplicate share | 25.2% |

## 5. An edge case from the blueprint

**Roster not yet updated.** the recipient is off duty. Planned response: Roster freshness check and the fallback route. Write the test that replays this case through your pipeline before you tune anything.

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
| `duplicate_share` | 0.25209 |
| `random_split_with_leak.macro_f1` | 0.90583 |
| `random_split_with_leak.ece` | 0.12071 |
| `time_split_clean.macro_f1` | 0.50985 |
| `time_split_clean.ece` | 0.053084 |
| `frozen_model_next_month.macro_f1` | 0.83668 |
| `frozen_model_next_month.ece` | 0.11294 |
| `frozen_model_months_6_7.macro_f1` | 0.50985 |
| `frozen_model_months_6_7.ece` | 0.053084 |

</details>
