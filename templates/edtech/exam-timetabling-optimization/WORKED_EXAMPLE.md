# Exam Timetabling Optimisation: worked example

> Run on synthetic data with `optimize` engine, seed 50808, knobs {"n_instances": 151, "noise": 0.317}, in 0.4 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Schedule exams across rooms and slots to minimise student clashes and back-to-back loads while satisfying room capacity and accessibility needs.

**Constraints that shape the design.** Hard constraints (no clashes, capacity); Accessibility rooms; Invigilator availability

**Label in this use case.** For "Exam Timetabling Optimisation": Schedule exams across rooms and slots to minimise student clashes and back-to-back loads while satisfying room capacity and accessibility needs. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Hard constraints missing from test data.

## 2. Choose the signals

Your strongest signal is **Student conflict matrix** (pairs of exams sharing students). Its rule: Enrolment data. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 37.4% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 36.7% worse than the oracle plan; optimal assignment on predictions is 19.4% worse; adding an uncertainty penalty gives 15.2%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 36.7% |
| Regret versus oracle, optimal on predictions | 19.4% |
| Regret versus oracle, optimal with an uncertainty penalty | 15.2% |
| Promised versus realised cost gap, optimal on predictions | 37.4% |

## 5. An edge case from the blueprint

**Late enrolment changes create new clashes.** timetable invalid. Planned response: Incremental re-solve minimising changes. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 151 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 124.67 |
| `greedy_on_predictions.promised_cost` | 97.677 |
| `greedy_on_predictions.optimism_gap_pct` | 27.639 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 36.663 |
| `optimal_on_predictions.realised_cost` | 108.93 |
| `optimal_on_predictions.promised_cost` | 79.279 |
| `optimal_on_predictions.optimism_gap_pct` | 37.402 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 19.406 |
| `optimal_with_uncertainty_penalty.realised_cost` | 105.11 |
| `optimal_with_uncertainty_penalty.promised_cost` | 81.251 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 29.365 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 15.218 |
| `oracle_true_costs.realised_cost` | 91.228 |
| `oracle_true_costs.promised_cost` | 96.305 |
| `oracle_true_costs.optimism_gap_pct` | -5.2726 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
