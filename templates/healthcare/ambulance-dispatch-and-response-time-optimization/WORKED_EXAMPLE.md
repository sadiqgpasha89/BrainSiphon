# Ambulance Dispatch & Positioning: worked example

> Run on synthetic data with `optimize` engine, seed 77774, knobs {"n_instances": 108, "noise": 0.321}, in 0.6 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Choose which ambulance to dispatch and where to reposition idle units to minimise response times and maximise survival coverage.

**Constraints that shape the design.** Decision under 100 ms; Priority-based response targets; Crew shift limits

**Label in this use case.** For "Ambulance Dispatch & Positioning": Choose which ambulance to dispatch and where to reposition idle units to minimise response times and maximise survival coverage. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Simulation uses historical calls ignoring policy effects.

## 2. Choose the signals

Your strongest signal is **Spatiotemporal demand intensity** (forecast calls per grid cell-hour). Its rule: Forecast not actual. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 40.7% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 35.0% worse than the oracle plan; optimal assignment on predictions is 20.4% worse; adding an uncertainty penalty gives 16.7%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 35.0% |
| Regret versus oracle, optimal on predictions | 20.4% |
| Regret versus oracle, optimal with an uncertainty penalty | 16.7% |
| Promised versus realised cost gap, optimal on predictions | 40.7% |

## 5. An edge case from the blueprint

**Mass-casualty incident.** all assumptions break. Planned response: Incident mode with manual command and fallback rules. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 108 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 123.44 |
| `greedy_on_predictions.promised_cost` | 95.899 |
| `greedy_on_predictions.optimism_gap_pct` | 28.717 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 34.972 |
| `optimal_on_predictions.realised_cost` | 110.07 |
| `optimal_on_predictions.promised_cost` | 78.228 |
| `optimal_on_predictions.optimism_gap_pct` | 40.707 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 20.356 |
| `optimal_with_uncertainty_penalty.realised_cost` | 106.72 |
| `optimal_with_uncertainty_penalty.promised_cost` | 80.153 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 33.144 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 16.69 |
| `oracle_true_costs.realised_cost` | 91.455 |
| `oracle_true_costs.promised_cost` | 95.567 |
| `oracle_true_costs.optimism_gap_pct` | -4.3027 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
