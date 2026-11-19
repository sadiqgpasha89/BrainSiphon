# Cross-Dock Door & Wave Scheduling: worked example

> Run on synthetic data with `optimize` engine, seed 82640, knobs {"n_instances": 164, "noise": 0.319}, in 0.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Assign inbound and outbound trucks to doors and sequence handling to minimise dwell and labour in cross-dock facilities.

**Constraints that shape the design.** Door capacity; Truck arrival uncertainty; Labour shifts

**Label in this use case.** For "Cross-Dock Door & Wave Scheduling": Assign inbound and outbound trucks to doors and sequence handling to minimise dwell and labour in cross-dock facilities. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Planning with perfect arrival knowledge.

## 2. Choose the signals

Your strongest signal is **Truck arrival ETA distribution** (predicted arrival with uncertainty). Its rule: Telematics. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 37.9% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 36.1% worse than the oracle plan; optimal assignment on predictions is 19.4% worse; adding an uncertainty penalty gives 15.5%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 36.1% |
| Regret versus oracle, optimal on predictions | 19.4% |
| Regret versus oracle, optimal with an uncertainty penalty | 15.5% |
| Promised versus realised cost gap, optimal on predictions | 37.9% |

## 5. An edge case from the blueprint

**Truck arrives hours late.** schedule cascade. Planned response: Rolling replan and buffer doors. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 164 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 124.68 |
| `greedy_on_predictions.promised_cost` | 96.781 |
| `greedy_on_predictions.optimism_gap_pct` | 28.83 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 36.06 |
| `optimal_on_predictions.realised_cost` | 109.38 |
| `optimal_on_predictions.promised_cost` | 79.339 |
| `optimal_on_predictions.optimism_gap_pct` | 37.868 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 19.364 |
| `optimal_with_uncertainty_penalty.realised_cost` | 105.89 |
| `optimal_with_uncertainty_penalty.promised_cost` | 81.322 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 30.206 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 15.547 |
| `oracle_true_costs.realised_cost` | 91.639 |
| `oracle_true_costs.promised_cost` | 96.421 |
| `oracle_true_costs.optimism_gap_pct` | -4.9598 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
