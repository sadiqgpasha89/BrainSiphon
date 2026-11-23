# SD-WAN Path Selection: worked example

> Run on synthetic data with `bandit` engine, seed 73920, knobs {"n": 20550, "logging_temperature": 1.088}, in 0.5 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Choose network paths per application class using latency, loss and cost so critical applications keep their targets while lower-cost links carry tolerant traffic.

**Constraints that shape the design.** Critical applications keep latency under 150 ms; Failover within 2 s; Policy by application class set by network owners

**Label in this use case.** For "SD-WAN Path Selection": Choose network paths per application class using latency, loss and cost so critical applications keep their targets while lower-cost links carry tolerant traffic. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Lowest latency everywhere.

## 2. Choose the signals

Your strongest signal is **Path latency and loss** (measured quality per link). Its rule: From probes. In the starter, the closest executable idea is **context features**: what is known about the situation when the decision is made. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Only logged actions have outcomes. Replaying the rows where the new policy agrees with the log gives 0.772 for the learned policy, but its true value is 0.790. The pack knows the truth because the world is simulated.

## 4. Baseline against the stronger design

The best constant action is worth 0.268; the learned policy is worth 0.790. Inverse-propensity weighting estimates 0.768 and the doubly robust estimator 0.800.

| Result | Value |
|---|---|
| True value, best constant action | 0.268 |
| True value, learned policy | 0.790 |
| Doubly robust estimate, learned policy | 0.800 |
| Inverse-propensity estimate, learned policy | 0.768 |
| Naive matched-rows estimate, learned policy | 0.772 |

## 5. An edge case from the blueprint

**Provider outage.** a link goes down. Planned response: Fast failover. Write the test that replays this case through your pipeline before you tune anything.

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
| `logged_rows` | 20550 |
| `logging_reward_rate` | 0.41479 |
| `always_best_average_action.true_value` | 0.26784 |
| `always_best_average_action.naive_matched` | 0.4743 |
| `always_best_average_action.ips` | 0.2659 |
| `always_best_average_action.snips` | 0.2669 |
| `always_best_average_action.doubly_robust` | 0.2681 |
| `always_best_average_action.match_rate` | 0.2705 |
| `learned_greedy.true_value` | 0.79036 |
| `learned_greedy.naive_matched` | 0.7722 |
| `learned_greedy.ips` | 0.7679 |
| `learned_greedy.snips` | 0.7916 |
| `learned_greedy.doubly_robust` | 0.7998 |
| `learned_greedy.match_rate` | 0.2367 |

</details>
