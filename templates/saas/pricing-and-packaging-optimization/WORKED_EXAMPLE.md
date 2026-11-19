# Pricing & Packaging Optimisation: worked example

> Run on synthetic data with `bandit` engine, seed 29154, knobs {"n": 20630, "logging_temperature": 1.161}, in 0.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Estimate willingness-to-pay and feature value to design plans, limits and price points that maximise revenue and satisfaction.

**Constraints that shape the design.** Price changes affect existing customers; Fairness and legal; Limited experiments

**Label in this use case.** For "Pricing & Packaging Optimisation": Estimate willingness-to-pay and feature value to design plans, limits and price points that maximise revenue and satisfaction. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Observational prices confounded by deal size.

## 2. Choose the signals

Your strongest signal is **Feature usage by plan** (usage of gated features). Its rule: Telemetry. In the starter, the closest executable idea is **context features**: what is known about the situation when the decision is made. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Only logged actions have outcomes. Replaying the rows where the new policy agrees with the log gives 0.674 for the learned policy, but its true value is 0.700. The pack knows the truth because the world is simulated.

## 4. Baseline against the stronger design

The best constant action is worth 0.432; the learned policy is worth 0.700. Inverse-propensity weighting estimates 0.618 and the doubly robust estimator 0.697.

| Result | Value |
|---|---|
| True value, best constant action | 0.432 |
| True value, learned policy | 0.700 |
| Doubly robust estimate, learned policy | 0.697 |
| Inverse-propensity estimate, learned policy | 0.618 |
| Naive matched-rows estimate, learned policy | 0.674 |

## 5. An edge case from the blueprint

**Legacy customers perceive an unfair increase.** existing customers see a price rise as unfair and churn spikes in the migrated cohort. Planned response: Grandfathering and phased migration with comms. Write the test that replays this case through your pipeline before you tune anything.

## 6. What to expect on your own data

Log propensities from day one, evaluate with a doubly robust estimator, and confirm with a small online holdout before changing the policy.

## 7. Do this next

1. `cd starter && make setup && make demo` to reproduce the table above.
2. Replace the synthetic generator with an extract of your data and keep the split, the leakage tests and the gates.
3. Run through `docs/02-delivery-plan.md` milestone by milestone; each exit gate is a number you can check.

<details>
<summary>Every number from this run</summary>

| Metric | Value |
|---|---|
| `logged_rows` | 20630 |
| `logging_reward_rate` | 0.39578 |
| `always_best_average_action.true_value` | 0.43217 |
| `always_best_average_action.naive_matched` | 0.5604 |
| `always_best_average_action.ips` | 0.4331 |
| `always_best_average_action.snips` | 0.4682 |
| `always_best_average_action.doubly_robust` | 0.4411 |
| `always_best_average_action.match_rate` | 0.1943 |
| `learned_greedy.true_value` | 0.70015 |
| `learned_greedy.naive_matched` | 0.6742 |
| `learned_greedy.ips` | 0.6177 |
| `learned_greedy.snips` | 0.6887 |
| `learned_greedy.doubly_robust` | 0.697 |
| `learned_greedy.match_rate` | 0.258 |

</details>
