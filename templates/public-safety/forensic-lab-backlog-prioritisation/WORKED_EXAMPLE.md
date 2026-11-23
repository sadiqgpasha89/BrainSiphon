# Forensic Lab Backlog Prioritisation: worked example

> Run on synthetic data with `optimize` engine, seed 36465, knobs {"n_instances": 100, "noise": 0.275}, in 1.3 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Plan the order of forensic analysis requests by statutory deadlines, case seriousness and lab capacity to cut turnaround for urgent cases, with analysts and prosecutors able to override.

**Constraints that shape the design.** Statutory and court deadlines as rules; No ranking by suspect characteristics; Analysts and prosecutors can reprioritise

**Label in this use case.** For "Forensic Lab Backlog Prioritisation": Plan the order of forensic analysis requests by statutory deadlines, case seriousness and lab capacity to cut turnaround for urgent cases, with analysts and prosecutors able to override. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Fastest-throughput objectives.

## 2. Choose the signals

Your strongest signal is **Days to court or statutory deadline** (time remaining). Its rule: From case systems. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 29.7% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 34.3% worse than the oracle plan; optimal assignment on predictions is 16.2% worse; adding an uncertainty penalty gives 12.7%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 34.3% |
| Regret versus oracle, optimal on predictions | 16.2% |
| Regret versus oracle, optimal with an uncertainty penalty | 12.7% |
| Promised versus realised cost gap, optimal on predictions | 29.7% |

## 5. An edge case from the blueprint

**Late urgent request.** a case jumps the queue. Planned response: Priority insertion with reasons. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 100 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 123.32 |
| `greedy_on_predictions.promised_cost` | 101 |
| `greedy_on_predictions.optimism_gap_pct` | 22.1 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 34.332 |
| `optimal_on_predictions.realised_cost` | 106.69 |
| `optimal_on_predictions.promised_cost` | 82.274 |
| `optimal_on_predictions.optimism_gap_pct` | 29.672 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 16.212 |
| `optimal_with_uncertainty_penalty.realised_cost` | 103.42 |
| `optimal_with_uncertainty_penalty.promised_cost` | 83.954 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 23.183 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 12.651 |
| `oracle_true_costs.realised_cost` | 91.804 |
| `oracle_true_costs.promised_cost` | 95.729 |
| `oracle_true_costs.optimism_gap_pct` | -4.1001 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
