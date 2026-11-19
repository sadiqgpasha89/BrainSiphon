# Loan Hardship Case Triage: worked example

> Run on synthetic data with `nlp` engine, seed 90441, knobs {"n_docs": 4900}, in 3.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Route incoming hardship requests to the right treatment and priority, quickly and fairly, while spotting customers in vulnerable circumstances.

**Constraints that shape the design.** Vulnerability flags reviewed by a trained human; No automated refusal of hardship assistance; Response within regulatory time limits

**Label in this use case.** For "Loan Hardship Case Triage": Route incoming hardship requests to the right treatment and priority, quickly and fairly, while spotting customers in vulnerable circumstances. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Offline labels come from past routing, which carries its own bias.

## 2. Choose the signals

Your strongest signal is **Days to next due date** (next scheduled payment minus today). Its rule: Dates must be contractual. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

25.1% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.850 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.412.

## 4. Baseline against the stronger design

The honest evaluation is 0.438 macro-F1 lower than the optimistic one. A frozen model scores 0.712 on the next month and 0.412 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.850 |
| Macro-F1, honest time split | 0.412 |
| Macro-F1, frozen model next month | 0.712 |
| Calibration error, honest split | 0.053 |
| Duplicate share | 25.1% |

## 5. An edge case from the blueprint

**Third-party request.** a family member writes on behalf of the customer. Planned response: Capture authority status and route to identity verification. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 4900 |
| `duplicate_share` | 0.25102 |
| `random_split_with_leak.macro_f1` | 0.84953 |
| `random_split_with_leak.ece` | 0.13366 |
| `time_split_clean.macro_f1` | 0.41195 |
| `time_split_clean.ece` | 0.052674 |
| `frozen_model_next_month.macro_f1` | 0.71189 |
| `frozen_model_next_month.ece` | 0.11845 |
| `frozen_model_months_6_7.macro_f1` | 0.41195 |
| `frozen_model_months_6_7.ece` | 0.052674 |

</details>
