# Dynamic Dispatch for Couriers & Gig Drivers: worked example

> Run on synthetic data with `optimize` engine, seed 57948, knobs {"n_instances": 112, "noise": 0.398}, in 0.4 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Match new orders to couriers in real time, balancing delivery time, courier earnings and batch efficiency under fluctuating supply.

**Constraints that shape the design.** Decision every 2-5 seconds; Courier acceptance probability; Fairness of earnings

**Label in this use case.** For "Dynamic Dispatch for Couriers & Gig Drivers": Match new orders to couriers in real time, balancing delivery time, courier earnings and batch efficiency under fluctuating supply. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Simulators that assume independent couriers.

## 2. Choose the signals

Your strongest signal is **Courier acceptance probability** (model per courier-order pair). Its rule: Past offers. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 60.1% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 45.5% worse than the oracle plan; optimal assignment on predictions is 28.2% worse; adding an uncertainty penalty gives 22.3%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 45.5% |
| Regret versus oracle, optimal on predictions | 28.2% |
| Regret versus oracle, optimal with an uncertainty penalty | 22.3% |
| Promised versus realised cost gap, optimal on predictions | 60.1% |

## 5. An edge case from the blueprint

**Sudden rain increases orders and reduces couriers.** demand spikes while courier supply drops, so the dispatch queue explodes and waits balloon. Planned response: Surge incentives and order throttling. Write the test that replays this case through your pipeline before you tune anything.

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
| `greedy_on_predictions.realised_cost` | 133.46 |
| `greedy_on_predictions.promised_cost` | 92.658 |
| `greedy_on_predictions.optimism_gap_pct` | 44.037 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 45.517 |
| `optimal_on_predictions.realised_cost` | 117.55 |
| `optimal_on_predictions.promised_cost` | 73.403 |
| `optimal_on_predictions.optimism_gap_pct` | 60.137 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 28.163 |
| `optimal_with_uncertainty_penalty.realised_cost` | 112.16 |
| `optimal_with_uncertainty_penalty.promised_cost` | 76.04 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 47.498 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 22.289 |
| `oracle_true_costs.realised_cost` | 91.716 |
| `oracle_true_costs.promised_cost` | 99.777 |
| `oracle_true_costs.optimism_gap_pct` | -8.0794 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
