# Court Hearing Scheduling Optimisation: worked example

> Run on synthetic data with `optimize` engine, seed 90542, knobs {"n_instances": 199, "noise": 0.312}, in 1.3 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Schedule hearings and courtrooms to cut waiting time and adjournments while respecting statutory timelines, judge availability and accessibility needs.

**Constraints that shape the design.** Statutory timelines are hard constraints; Judges and registrars can override; Accessibility and interpreter needs honoured

**Label in this use case.** For "Court Hearing Scheduling Optimisation": Schedule hearings and courtrooms to cut waiting time and adjournments while respecting statutory timelines, judge availability and accessibility needs. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Overbooking for utilisation.

## 2. Choose the signals

Your strongest signal is **Case type and expected duration** (hearing length by type). Its rule: From history. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 36.7% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 35.3% worse than the oracle plan; optimal assignment on predictions is 18.7% worse; adding an uncertainty penalty gives 15.2%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 35.3% |
| Regret versus oracle, optimal on predictions | 18.7% |
| Regret versus oracle, optimal with an uncertainty penalty | 15.2% |
| Promised versus realised cost gap, optimal on predictions | 36.7% |

## 5. An edge case from the blueprint

**Urgent application.** a priority hearing arrives. Planned response: Insertion with a re-plan. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 199 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 123.79 |
| `greedy_on_predictions.promised_cost` | 97.752 |
| `greedy_on_predictions.optimism_gap_pct` | 26.642 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 35.348 |
| `optimal_on_predictions.realised_cost` | 108.55 |
| `optimal_on_predictions.promised_cost` | 79.407 |
| `optimal_on_predictions.optimism_gap_pct` | 36.7 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 18.68 |
| `optimal_with_uncertainty_penalty.realised_cost` | 105.39 |
| `optimal_with_uncertainty_penalty.promised_cost` | 81.104 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 29.944 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 15.224 |
| `oracle_true_costs.realised_cost` | 91.464 |
| `oracle_true_costs.promised_cost` | 96.344 |
| `oracle_true_costs.optimism_gap_pct` | -5.0652 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
