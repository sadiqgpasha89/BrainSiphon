# Payment Routing Optimization: worked example

> Run on synthetic data with `bandit` engine, seed 23823, knobs {"n": 22350, "logging_temperature": 1.251}, in 0.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Route each payment to the acquirer or rail that maximises authorisation success at minimum fee, adapting to live outages and issuer behaviour.

**Constraints that shape the design.** Routing decision under 5 ms; Acquirer contracts and minimum volume commitments; Idempotent retries without double charge

**Label in this use case.** For "Payment Routing Optimization": Route each payment to the acquirer or rail that maximises authorisation success at minimum fee, adapting to live outages and issuer behaviour. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Replay evaluation ignores routes never chosen.

## 2. Choose the signals

Your strongest signal is **Issuer-BIN success posterior** (Beta posterior of auth success per (acquirer, BIN) with 30-minute decay). Its rule: Decay must not use future outcomes. In the starter, the closest executable idea is **context features**: what is known about the situation when the decision is made. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Only logged actions have outcomes. Replaying the rows where the new policy agrees with the log gives 0.786 for the learned policy, but its true value is 0.759. The pack knows the truth because the world is simulated.

## 4. Baseline against the stronger design

The best constant action is worth 0.429; the learned policy is worth 0.759. Inverse-propensity weighting estimates 0.775 and the doubly robust estimator 0.762.

| Result | Value |
|---|---|
| True value, best constant action | 0.429 |
| True value, learned policy | 0.759 |
| Doubly robust estimate, learned policy | 0.762 |
| Inverse-propensity estimate, learned policy | 0.775 |
| Naive matched-rows estimate, learned policy | 0.786 |

## 5. An edge case from the blueprint

**Acquirer silent failure.** success posterior lags real outage. Planned response: Circuit breaker on timeout rate and fast posterior decay. Write the test that replays this case through your pipeline before you tune anything.

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
| `logged_rows` | 22350 |
| `logging_reward_rate` | 0.44398 |
| `always_best_average_action.true_value` | 0.42891 |
| `always_best_average_action.naive_matched` | 0.6026 |
| `always_best_average_action.ips` | 0.4264 |
| `always_best_average_action.snips` | 0.4613 |
| `always_best_average_action.doubly_robust` | 0.4362 |
| `always_best_average_action.match_rate` | 0.2225 |
| `learned_greedy.true_value` | 0.75862 |
| `learned_greedy.naive_matched` | 0.7856 |
| `learned_greedy.ips` | 0.775 |
| `learned_greedy.snips` | 0.756 |
| `learned_greedy.doubly_robust` | 0.7616 |
| `learned_greedy.match_rate` | 0.3172 |

</details>
