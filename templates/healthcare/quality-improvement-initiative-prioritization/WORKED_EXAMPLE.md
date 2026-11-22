# Quality Improvement Initiative Prioritization: worked example

> Run on synthetic data with `optimize` engine, seed 7848, knobs {"n_instances": 114, "noise": 0.426}, in 2.7 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Rank proposed improvement projects by patient impact, compliance urgency, feasibility, cost, equity and expected benefit, giving leaders a transparent portfolio with trade-offs and assumptions to decide from.

**Constraints that shape the design.** Leadership sets criteria weights and makes the final portfolio decision; Hard constraints cover budget, staffing capacity and mandatory compliance projects; The scoring method is transparent with sensitivity to weights

**Label in this use case.** For "Quality Improvement Initiative Prioritization": Rank proposed improvement projects by patient impact, compliance urgency, feasibility, cost, equity and expected benefit, giving leaders a transparent portfolio with trade-offs and assumptions to decide from. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Treating estimated benefits as certain.

## 2. Choose the signals

Your strongest signal is **Expected patient impact** (estimated harm avoided or outcomes gained with evidence grade). Its rule: Estimates from the stated source. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 69.9% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 46.3% worse than the oracle plan; optimal assignment on predictions is 33.1% worse; adding an uncertainty penalty gives 24.7%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 46.3% |
| Regret versus oracle, optimal on predictions | 33.1% |
| Regret versus oracle, optimal with an uncertainty penalty | 24.7% |
| Promised versus realised cost gap, optimal on predictions | 69.9% |

## 5. An edge case from the blueprint

**Weights disputed.** different leaders prefer different weights. Planned response: Scenario views per weight set and a recorded decision. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 114 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 133.53 |
| `greedy_on_predictions.promised_cost` | 90.57 |
| `greedy_on_predictions.optimism_gap_pct` | 47.434 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 46.329 |
| `optimal_on_predictions.realised_cost` | 121.45 |
| `optimal_on_predictions.promised_cost` | 71.486 |
| `optimal_on_predictions.optimism_gap_pct` | 69.898 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 33.094 |
| `optimal_with_uncertainty_penalty.realised_cost` | 113.81 |
| `optimal_with_uncertainty_penalty.promised_cost` | 74.251 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 53.276 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 24.716 |
| `oracle_true_costs.realised_cost` | 91.254 |
| `oracle_true_costs.promised_cost` | 100.71 |
| `oracle_true_costs.optimism_gap_pct` | -9.3926 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
