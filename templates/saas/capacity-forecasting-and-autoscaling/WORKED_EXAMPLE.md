# Capacity Forecasting & Predictive Autoscaling: worked example

> Run on synthetic data with `control` engine, seed 36235, knobs {"days": 56}, in 0.8 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast load and scale infrastructure ahead of demand to meet SLOs at lowest cost.

**Constraints that shape the design.** Warm-up time of new nodes; SLO of p99 latency; Cost targets

**Label in this use case.** For "Capacity Forecasting & Predictive Autoscaling": Forecast load and scale infrastructure ahead of demand to meet SLOs at lowest cost. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Backtests without warm-up delays.

## 2. Choose the signals

Your strongest signal is **Request rate forecast** (seasonal and event-aware forecast). Its rule: Forecast quality. In the starter, the closest executable idea is **cumulative delivery**: what has been delivered so far, seen after a delay. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Opportunity is not constant: outages and surges move the target. A fixed schedule drifts by 6.60% on average and ends the day 4.6% under plan.

## 4. Baseline against the stronger design

A PID pacer with anti-windup tracks to 2.74%, a 58% reduction. Very high gains track tighter (1.17%) but make the control signal 7.3 times noisier, which costs delivery quality. A two-hour feedback delay raises tracking error to 5.88%.

| Result | Value |
|---|---|
| Tracking error, open loop | 6.60% |
| Tracking error, PID | 2.74% |
| Reduction versus open loop | 58.5% |
| Control jitter, PID versus aggressive gains | 0.013 vs 0.092 |
| Tracking error with a two-hour feedback delay | 5.88% |

## 5. An edge case from the blueprint

**Unannounced viral traffic.** forecast misses a spike. Planned response: Reactive safety net and fast burst capacity. Write the test that replays this case through your pipeline before you tune anything.

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
| `days` | 56 |
| `steps_per_day` | 288 |
| `open_loop.tracking_rmse_pct` | 6.5988 |
| `open_loop.end_of_day_underdelivery_pct` | 4.6448 |
| `open_loop.overshoot_max_pct` | 7.4047 |
| `open_loop.oscillation` | 0 |
| `open_loop.hit_cap` | 0.53571 |
| `pid.tracking_rmse_pct` | 2.7412 |
| `pid.end_of_day_underdelivery_pct` | 1.099 |
| `pid.overshoot_max_pct` | 5.6411 |
| `pid.oscillation` | 0.012569 |
| `pid.hit_cap` | 0.375 |
| `pid_aggressive_gains.tracking_rmse_pct` | 1.1733 |
| `pid_aggressive_gains.end_of_day_underdelivery_pct` | 0.038178 |
| `pid_aggressive_gains.overshoot_max_pct` | 1.8204 |
| `pid_aggressive_gains.oscillation` | 0.091943 |
| `pid_aggressive_gains.hit_cap` | 0.58929 |
| `pid_with_two_hour_feedback_delay.tracking_rmse_pct` | 5.8808 |
| `pid_with_two_hour_feedback_delay.end_of_day_underdelivery_pct` | 2.6084 |
| `pid_with_two_hour_feedback_delay.overshoot_max_pct` | 13.904 |
| `pid_with_two_hour_feedback_delay.oscillation` | 0.019642 |
| `pid_with_two_hour_feedback_delay.hit_cap` | 0.46429 |
| `rmse_reduction_vs_open_loop` | 0.5846 |

</details>
