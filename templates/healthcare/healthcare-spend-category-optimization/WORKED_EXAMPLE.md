# Healthcare Spend Category Optimization: worked example

> Run on synthetic data with `optimize` engine, seed 74701, knobs {"n_instances": 131, "noise": 0.36}, in 2.9 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Identify category-level savings opportunities while accounting for clinical equivalence, quality, availability, standardisation and switching costs, and present ranges with trade-offs for value analysis and procurement leadership.

**Constraints that shape the design.** Clinical value analysis approves substitutions and standardisation and the model only proposes hypotheses; Clinical equivalence and availability are hard constraints; Savings are ranges with stated confidence and not commitments

**Label in this use case.** For "Healthcare Spend Category Optimization": Identify category-level savings opportunities while accounting for clinical equivalence, quality, availability, standardisation and switching costs, and present ranges with trade-offs for value analysis and procurement leadership. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Counting gross savings.

## 2. Choose the signals

Your strongest signal is **Price dispersion** (spread of unit price for equivalent items across facilities). Its rule: After normalisation. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 50.3% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 38.6% worse than the oracle plan; optimal assignment on predictions is 24.4% worse; adding an uncertainty penalty gives 19.0%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 38.6% |
| Regret versus oracle, optimal on predictions | 24.4% |
| Regret versus oracle, optimal with an uncertainty penalty | 19.0% |
| Promised versus realised cost gap, optimal on predictions | 50.3% |

## 5. An edge case from the blueprint

**Taxonomy errors.** items land in the wrong category. Planned response: Taxonomy validation and a review loop. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 131 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 126.41 |
| `greedy_on_predictions.promised_cost` | 94.258 |
| `greedy_on_predictions.optimism_gap_pct` | 34.106 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 38.553 |
| `optimal_on_predictions.realised_cost` | 113.48 |
| `optimal_on_predictions.promised_cost` | 75.509 |
| `optimal_on_predictions.optimism_gap_pct` | 50.288 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 24.386 |
| `optimal_with_uncertainty_penalty.realised_cost` | 108.61 |
| `optimal_with_uncertainty_penalty.promised_cost` | 77.811 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 39.578 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 19.043 |
| `oracle_true_costs.realised_cost` | 91.233 |
| `oracle_true_costs.promised_cost` | 96.946 |
| `oracle_true_costs.optimism_gap_pct` | -5.8934 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
