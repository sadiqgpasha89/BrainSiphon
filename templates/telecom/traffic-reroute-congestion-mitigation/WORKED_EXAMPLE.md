# Traffic Reroute & Congestion Mitigation: worked example

> Run on synthetic data with `optimize` engine, seed 24622, knobs {"n_instances": 104, "noise": 0.355}, in 1.3 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Recommend traffic engineering changes that relieve congested links and routes within safe limits, so peak-hour quality holds without manual rerouting.

**Constraints that shape the design.** Changes limited to approved traffic-engineering templates; Every recommendation simulated against the topology before use; Human approval for changes that touch more than a set share of capacity

**Label in this use case.** For "Traffic Reroute & Congestion Mitigation": Recommend traffic engineering changes that relieve congested links and routes within safe limits, so peak-hour quality holds without manual rerouting. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Optimising mean utilisation.

## 2. Choose the signals

Your strongest signal is **Link utilisation percentile** (p95 utilisation over 5 minutes per link). Its rule: Use matching windows with the SLA. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 47.0% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 39.4% worse than the oracle plan; optimal assignment on predictions is 23.0% worse; adding an uncertainty penalty gives 18.9%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 39.4% |
| Regret versus oracle, optimal on predictions | 23.0% |
| Regret versus oracle, optimal with an uncertainty penalty | 18.9% |
| Promised versus realised cost gap, optimal on predictions | 47.0% |

## 5. An edge case from the blueprint

**Demand spike from a live event.** the model underestimates demand. Planned response: Use conservative upper quantiles and widen the headroom target. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 104 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 127.35 |
| `greedy_on_predictions.promised_cost` | 94.731 |
| `greedy_on_predictions.optimism_gap_pct` | 34.43 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 39.364 |
| `optimal_on_predictions.realised_cost` | 112.38 |
| `optimal_on_predictions.promised_cost` | 76.432 |
| `optimal_on_predictions.optimism_gap_pct` | 47.027 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 22.98 |
| `optimal_with_uncertainty_penalty.realised_cost` | 108.66 |
| `optimal_with_uncertainty_penalty.promised_cost` | 78.461 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 38.488 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 18.913 |
| `oracle_true_costs.realised_cost` | 91.377 |
| `oracle_true_costs.promised_cost` | 95.589 |
| `oracle_true_costs.optimism_gap_pct` | -4.4062 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
