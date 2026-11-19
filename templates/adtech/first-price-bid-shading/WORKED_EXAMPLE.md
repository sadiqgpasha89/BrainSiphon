# First-Price Auction Bid Shading: worked example

> Run on synthetic data with `bandit` engine, seed 16302, knobs {"n": 38120, "logging_temperature": 0.829}, in 0.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Shade bids below private value in first-price auctions to retain surplus while preserving win rate.

**Constraints that shape the design.** Per-request latency under 1 ms; Win-price feedback only on wins (or sometimes losses); Per-exchange differences

**Label in this use case.** For "First-Price Auction Bid Shading": Shade bids below private value in first-price auctions to retain surplus while preserving win rate. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on win prices only.

## 2. Choose the signals

Your strongest signal is **Predicted clearing price** (distribution quantiles of the market price). Its rule: Exchange feedback. In the starter, the closest executable idea is **context features**: what is known about the situation when the decision is made. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Only logged actions have outcomes. Replaying the rows where the new policy agrees with the log gives 0.686 for the learned policy, but its true value is 0.666. The pack knows the truth because the world is simulated.

## 4. Baseline against the stronger design

The best constant action is worth 0.506; the learned policy is worth 0.666. Inverse-propensity weighting estimates 0.589 and the doubly robust estimator 0.648.

| Result | Value |
|---|---|
| True value, best constant action | 0.506 |
| True value, learned policy | 0.666 |
| Doubly robust estimate, learned policy | 0.648 |
| Inverse-propensity estimate, learned policy | 0.589 |
| Naive matched-rows estimate, learned policy | 0.686 |

## 5. An edge case from the blueprint

**Exchange hides losing bid information.** model cannot learn the upper tail. Planned response: Exploration bids and sampling of losses where available. Write the test that replays this case through your pipeline before you tune anything.

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
| `logged_rows` | 38120 |
| `logging_reward_rate` | 0.35123 |
| `always_best_average_action.true_value` | 0.50563 |
| `always_best_average_action.naive_matched` | 0.5138 |
| `always_best_average_action.ips` | 0.4967 |
| `always_best_average_action.snips` | 0.5094 |
| `always_best_average_action.doubly_robust` | 0.5137 |
| `always_best_average_action.match_rate` | 0.177 |
| `learned_greedy.true_value` | 0.66559 |
| `learned_greedy.naive_matched` | 0.6862 |
| `learned_greedy.ips` | 0.5893 |
| `learned_greedy.snips` | 0.6442 |
| `learned_greedy.doubly_robust` | 0.6477 |
| `learned_greedy.match_rate` | 0.1946 |

</details>
