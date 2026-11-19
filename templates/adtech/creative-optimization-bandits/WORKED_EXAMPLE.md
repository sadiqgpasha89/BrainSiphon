# Creative Optimisation with Bandits: worked example

> Run on synthetic data with `bandit` engine, seed 65431, knobs {"n": 32550, "logging_temperature": 1.016}, in 0.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Choose which creative variant to show each user to maximise conversions, learning quickly while exploring new variants.

**Constraints that shape the design.** Few impressions per variant; Creative fatigue; Brand guidelines

**Label in this use case.** For "Creative Optimisation with Bandits": Choose which creative variant to show each user to maximise conversions, learning quickly while exploring new variants. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Replay with non-uniform logging.

## 2. Choose the signals

Your strongest signal is **Variant posterior CTR** (Beta posterior by context). Its rule: Prior. In the starter, the closest executable idea is **context features**: what is known about the situation when the decision is made. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Only logged actions have outcomes. Replaying the rows where the new policy agrees with the log gives 0.716 for the learned policy, but its true value is 0.728. The pack knows the truth because the world is simulated.

## 4. Baseline against the stronger design

The best constant action is worth 0.478; the learned policy is worth 0.728. Inverse-propensity weighting estimates 0.703 and the doubly robust estimator 0.745.

| Result | Value |
|---|---|
| True value, best constant action | 0.478 |
| True value, learned policy | 0.728 |
| Doubly robust estimate, learned policy | 0.745 |
| Inverse-propensity estimate, learned policy | 0.703 |
| Naive matched-rows estimate, learned policy | 0.716 |

## 5. An edge case from the blueprint

**Early random luck promotes a poor creative.** allocation collapses on a noisy winner. Planned response: Minimum exploration floor and prior shrinkage. Write the test that replays this case through your pipeline before you tune anything.

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
| `logged_rows` | 32550 |
| `logging_reward_rate` | 0.4757 |
| `always_best_average_action.true_value` | 0.47775 |
| `always_best_average_action.naive_matched` | 0.6401 |
| `always_best_average_action.ips` | 0.4381 |
| `always_best_average_action.snips` | 0.5124 |
| `always_best_average_action.doubly_robust` | 0.4738 |
| `always_best_average_action.match_rate` | 0.2786 |
| `learned_greedy.true_value` | 0.72839 |
| `learned_greedy.naive_matched` | 0.7164 |
| `learned_greedy.ips` | 0.7032 |
| `learned_greedy.snips` | 0.7552 |
| `learned_greedy.doubly_robust` | 0.7447 |
| `learned_greedy.match_rate` | 0.286 |

</details>
