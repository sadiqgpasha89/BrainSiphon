# Order Execution & Slippage Minimisation: worked example

> Run on synthetic data with `control` engine, seed 72933, knobs {"days": 77}, in 1.0 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Slice large parent orders into child orders that minimise implementation shortfall against arrival price.

**Constraints that shape the design.** Decision latency under 2 ms; Participation caps; Fat-finger protection

**Label in this use case.** For "Order Execution & Slippage Minimisation": Slice large parent orders into child orders that minimise implementation shortfall against arrival price. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Simulator lacks market impact.

## 2. Choose the signals

Your strongest signal is **Order-book imbalance** ((bid depth - ask depth) / total depth at top 5 levels). Its rule: Snapshot at decision time. In the starter, the closest executable idea is **cumulative delivery**: what has been delivered so far, seen after a delay. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Opportunity is not constant: outages and surges move the target. A fixed schedule drifts by 5.95% on average and ends the day 3.4% under plan.

## 4. Baseline against the stronger design

A PID pacer with anti-windup tracks to 2.53%, a 58% reduction. Very high gains track tighter (1.04%) but make the control signal 7.9 times noisier, which costs delivery quality. A two-hour feedback delay raises tracking error to 5.29%.

| Result | Value |
|---|---|
| Tracking error, open loop | 5.95% |
| Tracking error, PID | 2.53% |
| Reduction versus open loop | 57.6% |
| Control jitter, PID versus aggressive gains | 0.012 vs 0.091 |
| Tracking error with a two-hour feedback delay | 5.29% |

## 5. An edge case from the blueprint

**Venue outage mid-order.** stuck child orders. Planned response: Heartbeat monitor and auto-cancel with schedule rebalance. Write the test that replays this case through your pipeline before you tune anything.

## 6. What to expect on your own data

Tune against the worst shock and the real feedback delay, cap the control signal's rate of change, and test the controller in simulation before it touches spend.

## 7. Do this next

1. `cd starter && make setup && make demo` to reproduce the table above.
2. Replace the synthetic generator with an extract of your data and keep the split, the leakage tests and the gates.
3. Run through `docs/02-delivery-plan.md` milestone by milestone; each exit gate is a number you can check.

<details>
<summary>Every number from this run</summary>

| Metric | Value |
|---|---|
| `days` | 77 |
| `steps_per_day` | 288 |
| `open_loop.tracking_rmse_pct` | 5.9516 |
| `open_loop.end_of_day_underdelivery_pct` | 3.3994 |
| `open_loop.overshoot_max_pct` | 7.4376 |
| `open_loop.oscillation` | 0 |
| `open_loop.hit_cap` | 0.63636 |
| `pid.tracking_rmse_pct` | 2.526 |
| `pid.end_of_day_underdelivery_pct` | 0.89501 |
| `pid.overshoot_max_pct` | 5.4503 |
| `pid.oscillation` | 0.011508 |
| `pid.hit_cap` | 0.41558 |
| `pid_aggressive_gains.tracking_rmse_pct` | 1.0447 |
| `pid_aggressive_gains.end_of_day_underdelivery_pct` | 0.044956 |
| `pid_aggressive_gains.overshoot_max_pct` | 1.8553 |
| `pid_aggressive_gains.oscillation` | 0.090992 |
| `pid_aggressive_gains.hit_cap` | 0.46753 |
| `pid_with_two_hour_feedback_delay.tracking_rmse_pct` | 5.2933 |
| `pid_with_two_hour_feedback_delay.end_of_day_underdelivery_pct` | 2.0007 |
| `pid_with_two_hour_feedback_delay.overshoot_max_pct` | 13.133 |
| `pid_with_two_hour_feedback_delay.oscillation` | 0.018467 |
| `pid_with_two_hour_feedback_delay.hit_cap` | 0.58442 |
| `rmse_reduction_vs_open_loop` | 0.57557 |

</details>
