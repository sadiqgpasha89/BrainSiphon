# Smart Charging Schedule Optimisation: worked example

> Run on synthetic data with `optimize` engine, seed 8054, knobs {"n_instances": 134, "noise": 0.308}, in 1.2 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Schedule EV charging across a site or fleet to meet departure needs at the lowest cost within feeder and connection limits.

**Constraints that shape the design.** Every vehicle meets its stated departure target unless the driver agrees otherwise; Site and feeder limits enforced in the controller; Drivers can override

**Label in this use case.** For "Smart Charging Schedule Optimisation": Schedule EV charging across a site or fleet to meet departure needs at the lowest cost within feeder and connection limits. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Cost without a promise.

## 2. Choose the signals

Your strongest signal is **Departure time and energy needed** (driver-stated deadline and required energy). Its rule: From the session. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 36.6% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 35.7% worse than the oracle plan; optimal assignment on predictions is 18.8% worse; adding an uncertainty penalty gives 15.1%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 35.7% |
| Regret versus oracle, optimal on predictions | 18.8% |
| Regret versus oracle, optimal with an uncertainty penalty | 15.1% |
| Promised versus realised cost gap, optimal on predictions | 36.6% |

## 5. An edge case from the blueprint

**Early departure.** the driver leaves before the deadline. Planned response: Override and fast-charge options. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 134 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 124.09 |
| `greedy_on_predictions.promised_cost` | 98.174 |
| `greedy_on_predictions.optimism_gap_pct` | 26.399 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 35.739 |
| `optimal_on_predictions.realised_cost` | 108.65 |
| `optimal_on_predictions.promised_cost` | 79.524 |
| `optimal_on_predictions.optimism_gap_pct` | 36.622 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 18.847 |
| `optimal_with_uncertainty_penalty.realised_cost` | 105.22 |
| `optimal_with_uncertainty_penalty.promised_cost` | 81.264 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 29.478 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 15.097 |
| `oracle_true_costs.realised_cost` | 91.418 |
| `oracle_true_costs.promised_cost` | 95.649 |
| `oracle_true_costs.optimism_gap_pct` | -4.4238 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
