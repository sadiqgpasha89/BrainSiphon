# Notification Send-Time & Frequency Optimisation: worked example

> Run on synthetic data with `bandit` engine, seed 59984, knobs {"n": 38120, "logging_temperature": 1.135}, in 0.3 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Choose when and how often to send push, email and SMS per user to maximise engagement without driving opt-outs.

**Constraints that shape the design.** Quiet hours and regulation; Per-channel caps; Opt-out is permanent loss

**Label in this use case.** For "Notification Send-Time & Frequency Optimisation": Choose when and how often to send push, email and SMS per user to maximise engagement without driving opt-outs. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Optimising opens inflated by privacy-proxy pre-fetch.

## 2. Choose the signals

Your strongest signal is **Hourly engagement profile** (per-user open probability by hour with shrinkage). Its rule: Windowed history before the send. In the starter, the closest executable idea is **context features**: what is known about the situation when the decision is made. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Only logged actions have outcomes. Replaying the rows where the new policy agrees with the log gives 0.692 for the learned policy, but its true value is 0.690. The pack knows the truth because the world is simulated.

## 4. Baseline against the stronger design

The best constant action is worth 0.407; the learned policy is worth 0.690. Inverse-propensity weighting estimates 0.641 and the doubly robust estimator 0.691.

| Result | Value |
|---|---|
| True value, best constant action | 0.407 |
| True value, learned policy | 0.690 |
| Doubly robust estimate, learned policy | 0.691 |
| Inverse-propensity estimate, learned policy | 0.641 |
| Naive matched-rows estimate, learned policy | 0.692 |

## 5. An edge case from the blueprint

**Time-zone change when travelling.** quiet-hours breach. Planned response: Device-time-zone signal with last-active time. Write the test that replays this case through your pipeline before you tune anything.

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
| `logging_reward_rate` | 0.38993 |
| `always_best_average_action.true_value` | 0.40673 |
| `always_best_average_action.naive_matched` | 0.4904 |
| `always_best_average_action.ips` | 0.3895 |
| `always_best_average_action.snips` | 0.404 |
| `always_best_average_action.doubly_robust` | 0.3957 |
| `always_best_average_action.match_rate` | 0.2701 |
| `learned_greedy.true_value` | 0.68968 |
| `learned_greedy.naive_matched` | 0.6919 |
| `learned_greedy.ips` | 0.6415 |
| `learned_greedy.snips` | 0.6864 |
| `learned_greedy.doubly_robust` | 0.6913 |
| `learned_greedy.match_rate` | 0.2583 |

</details>
