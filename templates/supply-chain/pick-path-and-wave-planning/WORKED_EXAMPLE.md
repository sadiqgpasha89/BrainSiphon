# Pick-Path & Wave Planning: worked example

> Run on synthetic data with `optimize` engine, seed 18343, knobs {"n_instances": 182, "noise": 0.267}, in 0.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Group orders into waves and sequence picks to meet cut-off times with minimal labour and congestion.

**Constraints that shape the design.** Carrier cut-offs; Zone capacity; Pick-station balance

**Label in this use case.** For "Pick-Path & Wave Planning": Group orders into waves and sequence picks to meet cut-off times with minimal labour and congestion. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Travel time assumptions from empty warehouse.

## 2. Choose the signals

Your strongest signal is **Order due-time slack** (time to carrier cut-off). Its rule: Cut-off table. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 27.2% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 31.3% worse than the oracle plan; optimal assignment on predictions is 14.6% worse; adding an uncertainty penalty gives 11.8%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 31.3% |
| Regret versus oracle, optimal on predictions | 14.6% |
| Regret versus oracle, optimal with an uncertainty penalty | 11.8% |
| Promised versus realised cost gap, optimal on predictions | 27.2% |

## 5. An edge case from the blueprint

**Late rush of orders before cut-off.** schedule collapses. Planned response: Priority re-ranking and overflow pickers. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 182 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 119.77 |
| `greedy_on_predictions.promised_cost` | 100.02 |
| `greedy_on_predictions.optimism_gap_pct` | 19.751 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 31.26 |
| `optimal_on_predictions.realised_cost` | 104.59 |
| `optimal_on_predictions.promised_cost` | 82.227 |
| `optimal_on_predictions.optimism_gap_pct` | 27.2 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 14.622 |
| `optimal_with_uncertainty_penalty.realised_cost` | 102.04 |
| `optimal_with_uncertainty_penalty.promised_cost` | 83.578 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 22.092 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 11.828 |
| `oracle_true_costs.realised_cost` | 91.249 |
| `oracle_true_costs.promised_cost` | 94.678 |
| `oracle_true_costs.optimism_gap_pct` | -3.6209 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
