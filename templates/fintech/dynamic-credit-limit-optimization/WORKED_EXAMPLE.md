# Dynamic Credit Limit Optimization: worked example

> Run on synthetic data with `bandit` engine, seed 7314, knobs {"n": 39690, "logging_temperature": 0.806}, in 0.3 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Raise or lower card limits monthly to maximise risk-adjusted revenue subject to loss and capital constraints.

**Constraints that shape the design.** Regulatory limit-change notices; Portfolio loss ceiling; Fairness across segments

**Label in this use case.** For "Dynamic Credit Limit Optimization": Raise or lower card limits monthly to maximise risk-adjusted revenue subject to loss and capital constraints. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Naive A/B of limit changes confounded by selection.

## 2. Choose the signals

Your strongest signal is **Spend-to-limit headroom** (peak utilisation divided by limit over 3 cycles). Its rule: Use pre-decision cycles. In the starter, the closest executable idea is **context features**: what is known about the situation when the decision is made. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Only logged actions have outcomes. Replaying the rows where the new policy agrees with the log gives 0.711 for the learned policy, but its true value is 0.684. The pack knows the truth because the world is simulated.

## 4. Baseline against the stronger design

The best constant action is worth 0.419; the learned policy is worth 0.684. Inverse-propensity weighting estimates 0.601 and the doubly robust estimator 0.676.

| Result | Value |
|---|---|
| True value, best constant action | 0.419 |
| True value, learned policy | 0.684 |
| Doubly robust estimate, learned policy | 0.676 |
| Inverse-propensity estimate, learned policy | 0.601 |
| Naive matched-rows estimate, learned policy | 0.711 |

## 5. An edge case from the blueprint

**Recession onset.** policy keeps raising limits on stale elasticity. Planned response: Macro circuit breaker freezes increases and shifts to conservative policy. Write the test that replays this case through your pipeline before you tune anything.

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
| `logged_rows` | 39690 |
| `logging_reward_rate` | 0.34898 |
| `always_best_average_action.true_value` | 0.41887 |
| `always_best_average_action.naive_matched` | 0.4549 |
| `always_best_average_action.ips` | 0.3551 |
| `always_best_average_action.snips` | 0.406 |
| `always_best_average_action.doubly_robust` | 0.3964 |
| `always_best_average_action.match_rate` | 0.312 |
| `learned_greedy.true_value` | 0.6838 |
| `learned_greedy.naive_matched` | 0.7105 |
| `learned_greedy.ips` | 0.6014 |
| `learned_greedy.snips` | 0.6648 |
| `learned_greedy.doubly_robust` | 0.6756 |
| `learned_greedy.match_rate` | 0.207 |

</details>
