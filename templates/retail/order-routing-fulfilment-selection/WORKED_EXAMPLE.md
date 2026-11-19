# Order Routing & Fulfilment Node Selection: worked example

> Run on synthetic data with `optimize` engine, seed 86531, knobs {"n_instances": 127, "noise": 0.254}, in 0.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Choose the warehouse or store that fulfils each order to minimise shipping cost and delay while protecting inventory for future demand.

**Constraints that shape the design.** Decision in 50 ms; Split-shipment limits; Store pick capacity

**Label in this use case.** For "Order Routing & Fulfilment Node Selection": Choose the warehouse or store that fulfils each order to minimise shipping cost and delay while protecting inventory for future demand. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Simulator uses perfect inventory.

## 2. Choose the signals

Your strongest signal is **Node inventory confidence** (probability the item is truly available). Its rule: Cycle-count based. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 24.3% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 30.5% worse than the oracle plan; optimal assignment on predictions is 12.7% worse; adding an uncertainty penalty gives 10.2%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 30.5% |
| Regret versus oracle, optimal on predictions | 12.7% |
| Regret versus oracle, optimal with an uncertainty penalty | 10.2% |
| Promised versus realised cost gap, optimal on predictions | 24.3% |

## 5. An edge case from the blueprint

**Phantom inventory at store.** cancel and re-route. Planned response: Confidence scores and verification pick policy. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 127 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 119.32 |
| `greedy_on_predictions.promised_cost` | 101.22 |
| `greedy_on_predictions.optimism_gap_pct` | 17.884 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 30.506 |
| `optimal_on_predictions.realised_cost` | 103.03 |
| `optimal_on_predictions.promised_cost` | 82.905 |
| `optimal_on_predictions.optimism_gap_pct` | 24.271 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 12.683 |
| `optimal_with_uncertainty_penalty.realised_cost` | 100.8 |
| `optimal_with_uncertainty_penalty.promised_cost` | 84.201 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 19.714 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 10.248 |
| `oracle_true_costs.realised_cost` | 91.431 |
| `oracle_true_costs.promised_cost` | 93.766 |
| `oracle_true_costs.optimism_gap_pct` | -2.4899 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
