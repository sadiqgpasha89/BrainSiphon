# Cross-Border Payment FX & Fee Pricing: worked example

> Run on synthetic data with `bandit` engine, seed 17836, knobs {"n": 28550, "logging_temperature": 1.29}, in 0.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Price FX markup and fees per corridor and customer segment to maximise revenue subject to conversion and fairness constraints.

**Constraints that shape the design.** Price transparency regulations; No discriminatory pricing; Live FX rate volatility

**Label in this use case.** For "Cross-Border Payment FX & Fee Pricing": Price FX markup and fees per corridor and customer segment to maximise revenue subject to conversion and fairness constraints. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Observational price-conversion data confounded.

## 2. Choose the signals

Your strongest signal is **Corridor price elasticity** (log-log demand response from randomised price tests). Its rule: Use randomised cells only. In the starter, the closest executable idea is **context features**: what is known about the situation when the decision is made. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Only logged actions have outcomes. Replaying the rows where the new policy agrees with the log gives 0.615 for the learned policy, but its true value is 0.637. The pack knows the truth because the world is simulated.

## 4. Baseline against the stronger design

The best constant action is worth 0.424; the learned policy is worth 0.637. Inverse-propensity weighting estimates 0.646 and the doubly robust estimator 0.642.

| Result | Value |
|---|---|
| True value, best constant action | 0.424 |
| True value, learned policy | 0.637 |
| Doubly robust estimate, learned policy | 0.642 |
| Inverse-propensity estimate, learned policy | 0.646 |
| Naive matched-rows estimate, learned policy | 0.615 |

## 5. An edge case from the blueprint

**Volatility spike.** quotes become loss-making. Planned response: Dynamic margin floor tied to realised volatility. Write the test that replays this case through your pipeline before you tune anything.

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
| `logged_rows` | 28550 |
| `logging_reward_rate` | 0.4427 |
| `always_best_average_action.true_value` | 0.42391 |
| `always_best_average_action.naive_matched` | 0.5844 |
| `always_best_average_action.ips` | 0.4133 |
| `always_best_average_action.snips` | 0.4273 |
| `always_best_average_action.doubly_robust` | 0.4195 |
| `always_best_average_action.match_rate` | 0.3088 |
| `learned_greedy.true_value` | 0.63731 |
| `learned_greedy.naive_matched` | 0.615 |
| `learned_greedy.ips` | 0.6463 |
| `learned_greedy.snips` | 0.6472 |
| `learned_greedy.doubly_robust` | 0.6418 |
| `learned_greedy.match_rate` | 0.2589 |

</details>
