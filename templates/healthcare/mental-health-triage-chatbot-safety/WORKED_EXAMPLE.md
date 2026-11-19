# Mental-Health Support Chatbot with Safety Triage: worked example

> Run on synthetic data with `nlp` engine, seed 26080, knobs {"n_docs": 5430}, in 2.0 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Provide supportive, evidence-based conversations while detecting crisis signals and escalating to humans immediately and safely.

**Constraints that shape the design.** Crisis detection recall above 99% on high-risk cases; Never provide diagnosis; Emergency resource routing

**Label in this use case.** For "Mental-Health Support Chatbot with Safety Triage": Provide supportive, evidence-based conversations while detecting crisis signals and escalating to humans immediately and safely. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Red-team set written by builders only.

## 2. Choose the signals

Your strongest signal is **Crisis-risk classifier score** (calibrated risk of self-harm intent). Its rule: Tune for high recall. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

24.7% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.882 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.421.

## 4. Baseline against the stronger design

The honest evaluation is 0.462 macro-F1 lower than the optimistic one. A frozen model scores 0.775 on the next month and 0.421 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.882 |
| Macro-F1, honest time split | 0.421 |
| Macro-F1, frozen model next month | 0.775 |
| Calibration error, honest split | 0.030 |
| Duplicate share | 24.7% |

## 5. An edge case from the blueprint

**Indirect or coded crisis language.** euphemistic or coded expressions of crisis are not recognised and escalation is missed. Planned response: Continuous red-teaming and clinician-labelled hard cases. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 5430 |
| `duplicate_share` | 0.24696 |
| `random_split_with_leak.macro_f1` | 0.88208 |
| `random_split_with_leak.ece` | 0.11556 |
| `time_split_clean.macro_f1` | 0.42052 |
| `time_split_clean.ece` | 0.029595 |
| `frozen_model_next_month.macro_f1` | 0.77548 |
| `frozen_model_next_month.ece` | 0.102 |
| `frozen_model_months_6_7.macro_f1` | 0.42052 |
| `frozen_model_months_6_7.ece` | 0.029595 |

</details>
