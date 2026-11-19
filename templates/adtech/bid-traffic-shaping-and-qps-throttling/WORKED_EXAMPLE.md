# Bid Traffic Shaping & QPS Throttling: worked example

> Run on synthetic data with `control` engine, seed 45540, knobs {"days": 58}, in 1.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Decide which bid requests to process or drop at ingestion to cut infrastructure cost while retaining most of the value.

**Constraints that shape the design.** Decision under 0.5 ms; Hundreds of millions of requests per second across exchanges; Value estimates stale

**Label in this use case.** For "Bid Traffic Shaping & QPS Throttling": Decide which bid requests to process or drop at ingestion to cut infrastructure cost while retaining most of the value. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating with historical traffic while throttling changes the data.

## 2. Choose the signals

Your strongest signal is **Segment win-rate and value** (historical value per request type). Its rule: Window. In the starter, the closest executable idea is **cumulative delivery**: what has been delivered so far, seen after a delay. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Opportunity is not constant: outages and surges move the target. A fixed schedule drifts by 6.98% on average and ends the day 5.7% under plan.

## 4. Baseline against the stronger design

A PID pacer with anti-windup tracks to 2.71%, a 61% reduction. Very high gains track tighter (1.21%) but make the control signal 7.8 times noisier, which costs delivery quality. A two-hour feedback delay raises tracking error to 5.40%.

| Result | Value |
|---|---|
| Tracking error, open loop | 6.98% |
| Tracking error, PID | 2.71% |
| Reduction versus open loop | 61.1% |
| Control jitter, PID versus aggressive gains | 0.011 vs 0.087 |
| Tracking error with a two-hour feedback delay | 5.40% |

## 5. An edge case from the blueprint

**Exchange traffic surges beyond capacity.** bidder overloaded and latency spikes. Planned response: Immediate load shedding with priority classes. Write the test that replays this case through your pipeline before you tune anything.

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
| `days` | 58 |
| `steps_per_day` | 288 |
| `open_loop.tracking_rmse_pct` | 6.9753 |
| `open_loop.end_of_day_underdelivery_pct` | 5.6765 |
| `open_loop.overshoot_max_pct` | 6.4161 |
| `open_loop.oscillation` | 0 |
| `open_loop.hit_cap` | 0.55172 |
| `pid.tracking_rmse_pct` | 2.71 |
| `pid.end_of_day_underdelivery_pct` | 0.72268 |
| `pid.overshoot_max_pct` | 5.4215 |
| `pid.oscillation` | 0.011182 |
| `pid.hit_cap` | 0.43103 |
| `pid_aggressive_gains.tracking_rmse_pct` | 1.2148 |
| `pid_aggressive_gains.end_of_day_underdelivery_pct` | 0.050862 |
| `pid_aggressive_gains.overshoot_max_pct` | 1.8127 |
| `pid_aggressive_gains.oscillation` | 0.08729 |
| `pid_aggressive_gains.hit_cap` | 0.44828 |
| `pid_with_two_hour_feedback_delay.tracking_rmse_pct` | 5.3958 |
| `pid_with_two_hour_feedback_delay.end_of_day_underdelivery_pct` | 1.4966 |
| `pid_with_two_hour_feedback_delay.overshoot_max_pct` | 12.717 |
| `pid_with_two_hour_feedback_delay.oscillation` | 0.017856 |
| `pid_with_two_hour_feedback_delay.hit_cap` | 0.63793 |
| `rmse_reduction_vs_open_loop` | 0.61149 |

</details>
