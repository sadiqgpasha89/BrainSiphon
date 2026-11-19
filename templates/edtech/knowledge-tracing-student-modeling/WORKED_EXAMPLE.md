# Knowledge Tracing & Student Modelling: worked example

> Run on synthetic data with Hand-written starter, in 8.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Estimate each learner's evolving mastery per skill from their answer history to drive practice selection and progress reports.

**Constraints that shape the design.** Update after every answer in under 30 ms; Millions of learners; Interpretable mastery per skill

**Label in this use case.** For "Knowledge Tracing & Student Modelling": Estimate each learner's evolving mastery per skill from their answer history to drive practice selection and progress reports. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Predicting next answers with student leakage.

## 2. Choose the signals

Your strongest signal is **Recent correctness with recency weighting** (exponentially weighted correct rate per skill). Its rule: Order by timestamp not insertion. In the starter, the closest executable idea is ****: . Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

This pack ships a hand-written starter with its own data generator, written to plant the traps named in the blueprint. Its README lists them one by one, and its tests make each one executable.

## 4. Baseline against the stronger design

The starter runs a baseline and a stronger design under the evaluation discipline the blueprint prescribes. The table at the end of this page lists every number from this run.

| Result | Value |
|---|---|
| students | 2500 |
| answers | 349830 |
| test_students | 625 |
| test_answers | 87551 |
| skill_running_accuracy.auc | 0.5802 |
| skill_running_accuracy.rmse | 0.5147 |

## 5. An edge case from the blueprint

**New curriculum remaps skills.** historical mastery becomes mislabelled. Planned response: Skill-mapping versioning and mastery migration jobs. Write the test that replays this case through your pipeline before you tune anything.

## 6. What to expect on your own data

Read starter/README.md for the milestone-by-milestone expectations; then replace the synthetic generator with your data and keep the tests.

## 7. Do this next

1. `cd starter && make setup && make demo` to reproduce the table above.
2. Replace the synthetic generator with an extract of your data and keep the split, the leakage tests and the gates.
3. Run through `docs/02-delivery-plan.md` milestone by milestone; each exit gate is a number you can check.

<details>
<summary>Every number from this run</summary>

| Metric | Value |
|---|---|
| `students` | 2500 |
| `answers` | 349830 |
| `test_students` | 625 |
| `test_answers` | 87551 |
| `skill_running_accuracy.auc` | 0.58024 |
| `skill_running_accuracy.rmse` | 0.51473 |
| `skill_running_accuracy.ece` | 0.11399 |
| `pfa_logistic.auc` | 0.62602 |
| `pfa_logistic.rmse` | 0.4876 |
| `pfa_logistic.ece` | 0.0097066 |
| `gbdt_tracer.auc` | 0.64995 |
| `gbdt_tracer.rmse` | 0.48248 |
| `gbdt_tracer.ece` | 0.0063398 |
| `oracle_auc` | 0.7251 |

</details>
