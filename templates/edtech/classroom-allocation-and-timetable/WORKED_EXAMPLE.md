# Course Timetabling & Classroom Allocation: worked example

> Run on synthetic data with `optimize` engine, seed 18843, knobs {"n_instances": 144, "noise": 0.332}, in 0.4 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Allocate courses to times and rooms to maximise utilisation and student/teacher preferences under capacity and accessibility constraints.

**Constraints that shape the design.** Hard constraints; Multi-campus travel; Enrolment forecasts

**Label in this use case.** For "Course Timetabling & Classroom Allocation": Allocate courses to times and rooms to maximise utilisation and student/teacher preferences under capacity and accessibility constraints. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Optimising on forecasts without uncertainty.

## 2. Choose the signals

Your strongest signal is **Enrolment forecast** (predicted course enrolment). Its rule: Model. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 42.0% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 36.7% worse than the oracle plan; optimal assignment on predictions is 21.3% worse; adding an uncertainty penalty gives 16.8%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 36.7% |
| Regret versus oracle, optimal on predictions | 21.3% |
| Regret versus oracle, optimal with an uncertainty penalty | 16.8% |
| Promised versus realised cost gap, optimal on predictions | 42.0% |

## 5. An edge case from the blueprint

**Enrolment under-forecast.** under-forecast enrolment allocates a room that is too small on the first day of term. Planned response: Safety margins and flexible rooms. Write the test that replays this case through your pipeline before you tune anything.

## 6. What to expect on your own data

Judge a plan by its realised cost against an oracle on simulated truth, not by the objective the optimiser reported. Keep the uncertainty penalty and the optimism-gap metric.

## 7. Do this next

1. `cd starter && make setup && make demo` to reproduce the table above.
2. Replace the synthetic generator with an extract of your data and keep the split, the leakage tests and the gates.
3. Run through `docs/02-delivery-plan.md` milestone by milestone; each exit gate is a number you can check.

<details>
<summary>Every number from this run</summary>

| Metric | Value |
|---|---|
| `instances` | 144 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 124.99 |
| `greedy_on_predictions.promised_cost` | 95.963 |
| `greedy_on_predictions.optimism_gap_pct` | 30.249 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 36.698 |
| `optimal_on_predictions.realised_cost` | 110.9 |
| `optimal_on_predictions.promised_cost` | 78.102 |
| `optimal_on_predictions.optimism_gap_pct` | 41.996 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 21.289 |
| `optimal_with_uncertainty_penalty.realised_cost` | 106.78 |
| `optimal_with_uncertainty_penalty.promised_cost` | 80.111 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 33.296 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 16.787 |
| `oracle_true_costs.realised_cost` | 91.435 |
| `oracle_true_costs.promised_cost` | 95.986 |
| `oracle_true_costs.optimism_gap_pct` | -4.741 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
