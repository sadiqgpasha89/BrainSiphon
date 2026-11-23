# Capable-to-Promise Order Promising: worked example

> Run on synthetic data with `optimize` engine, seed 55561, knobs {"n_instances": 112, "noise": 0.283}, in 1.2 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Give customers a reliable delivery date at order entry by checking material, capacity and logistics in real time so promised dates are met.

**Constraints that shape the design.** Promise computed within 80 ms; Dates reflect live capacity and stock; Sales can reserve capacity within limits

**Label in this use case.** For "Capable-to-Promise Order Promising": Give customers a reliable delivery date at order entry by checking material, capacity and logistics in real time so promised dates are met. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Standard lead times.

## 2. Choose the signals

Your strongest signal is **Available stock and planned receipts** (stock position by date). Its rule: Live. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 32.0% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 33.1% worse than the oracle plan; optimal assignment on predictions is 16.7% worse; adding an uncertainty penalty gives 13.1%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 33.1% |
| Regret versus oracle, optimal on predictions | 16.7% |
| Regret versus oracle, optimal with an uncertainty penalty | 13.1% |
| Promised versus realised cost gap, optimal on predictions | 32.0% |

## 5. An edge case from the blueprint

**Capacity overbooked.** many requests at once. Planned response: Reservation locks and queueing. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 112 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 123.2 |
| `greedy_on_predictions.promised_cost` | 99.865 |
| `greedy_on_predictions.optimism_gap_pct` | 23.37 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 33.098 |
| `optimal_on_predictions.realised_cost` | 107.98 |
| `optimal_on_predictions.promised_cost` | 81.773 |
| `optimal_on_predictions.optimism_gap_pct` | 32.049 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 16.652 |
| `optimal_with_uncertainty_penalty.realised_cost` | 104.69 |
| `optimal_with_uncertainty_penalty.promised_cost` | 83.511 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 25.359 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 13.095 |
| `oracle_true_costs.realised_cost` | 92.567 |
| `oracle_true_costs.promised_cost` | 96.201 |
| `oracle_true_costs.optimism_gap_pct` | -3.7783 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
