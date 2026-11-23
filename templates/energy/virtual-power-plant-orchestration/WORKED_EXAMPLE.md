# Virtual Power Plant Orchestration: worked example

> Run on synthetic data with `optimize` engine, seed 20007, knobs {"n_instances": 137, "noise": 0.351}, in 1.3 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Coordinate distributed batteries, solar, flexible loads and chargers as one resource that bids into markets and follows grid signals, within each owner's limits and consent.

**Constraints that shape the design.** Each asset's owner limits and consent respected; Safety limits in local controllers; Delivery verified against metered data

**Label in this use case.** For "Virtual Power Plant Orchestration": Coordinate distributed batteries, solar, flexible loads and chargers as one resource that bids into markets and follows grid signals, within each owner's limits and consent. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Central control without local safety.

## 2. Choose the signals

Your strongest signal is **Fleet availability forecast** (forecast of controllable capacity). Its rule: From asset models. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 47.9% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 39.4% worse than the oracle plan; optimal assignment on predictions is 23.6% worse; adding an uncertainty penalty gives 19.9%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 39.4% |
| Regret versus oracle, optimal on predictions | 23.6% |
| Regret versus oracle, optimal with an uncertainty penalty | 19.9% |
| Promised versus realised cost gap, optimal on predictions | 47.9% |

## 5. An edge case from the blueprint

**Link loss.** devices lose connection. Planned response: Local fallback behaviour. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 137 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 128.1 |
| `greedy_on_predictions.promised_cost` | 96.353 |
| `greedy_on_predictions.optimism_gap_pct` | 32.951 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 39.438 |
| `optimal_on_predictions.realised_cost` | 113.58 |
| `optimal_on_predictions.promised_cost` | 76.804 |
| `optimal_on_predictions.optimism_gap_pct` | 47.882 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 23.629 |
| `optimal_with_uncertainty_penalty.realised_cost` | 110.18 |
| `optimal_with_uncertainty_penalty.promised_cost` | 78.956 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 39.54 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 19.924 |
| `oracle_true_costs.realised_cost` | 91.871 |
| `oracle_true_costs.promised_cost` | 97.354 |
| `oracle_true_costs.optimism_gap_pct` | -5.6321 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
