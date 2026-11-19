# Loyalty Programme Offer Optimisation: worked example

> Run on synthetic data with `bandit` engine, seed 38346, knobs {"n": 38430, "logging_temperature": 1.263}, in 0.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Choose personalised points, tier and reward offers that raise lifetime value subject to a programme cost budget.

**Constraints that shape the design.** Programme liability accounting; Fairness across tiers; Offer expiry rules

**Label in this use case.** For "Loyalty Programme Offer Optimisation": Choose personalised points, tier and reward offers that raise lifetime value subject to a programme cost budget. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Logged data lacks randomisation.

## 2. Choose the signals

Your strongest signal is **Reward elasticity** (spend response to reward intensity). Its rule: Randomised test cells. In the starter, the closest executable idea is **context features**: what is known about the situation when the decision is made. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Only logged actions have outcomes. Replaying the rows where the new policy agrees with the log gives 0.590 for the learned policy, but its true value is 0.678. The pack knows the truth because the world is simulated.

## 4. Baseline against the stronger design

The best constant action is worth 0.326; the learned policy is worth 0.678. Inverse-propensity weighting estimates 0.673 and the doubly robust estimator 0.682.

| Result | Value |
|---|---|
| True value, best constant action | 0.326 |
| True value, learned policy | 0.678 |
| Doubly robust estimate, learned policy | 0.682 |
| Inverse-propensity estimate, learned policy | 0.673 |
| Naive matched-rows estimate, learned policy | 0.590 |

## 5. An edge case from the blueprint

**Points liability spikes.** unexpected finance exposure. Planned response: Liability cap with real-time accrual monitor. Write the test that replays this case through your pipeline before you tune anything.

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
| `logged_rows` | 38430 |
| `logging_reward_rate` | 0.33875 |
| `always_best_average_action.true_value` | 0.32626 |
| `always_best_average_action.naive_matched` | 0.4202 |
| `always_best_average_action.ips` | 0.3239 |
| `always_best_average_action.snips` | 0.3339 |
| `always_best_average_action.doubly_robust` | 0.3353 |
| `always_best_average_action.match_rate` | 0.2566 |
| `learned_greedy.true_value` | 0.67791 |
| `learned_greedy.naive_matched` | 0.5898 |
| `learned_greedy.ips` | 0.6729 |
| `learned_greedy.snips` | 0.6732 |
| `learned_greedy.doubly_robust` | 0.682 |
| `learned_greedy.match_rate` | 0.1605 |

</details>
