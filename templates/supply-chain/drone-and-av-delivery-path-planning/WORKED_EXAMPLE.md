# Drone & Autonomous Vehicle Delivery Planning: worked example

> Run on synthetic data with `control` engine, seed 87924, knobs {"days": 46}, in 0.8 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Plan safe, energy-feasible paths for delivery drones and sidewalk robots in dynamic environments with regulatory constraints.

**Constraints that shape the design.** Airspace and no-fly rules; Battery limits; Real-time perception

**Label in this use case.** For "Drone & Autonomous Vehicle Delivery Planning": Plan safe, energy-feasible paths for delivery drones and sidewalk robots in dynamic environments with regulatory constraints. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Simulation without realistic wind.

## 2. Choose the signals

Your strongest signal is **Wind and weather forecast** (forecast along path). Its rule: Forecast. In the starter, the closest executable idea is **cumulative delivery**: what has been delivered so far, seen after a delay. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Opportunity is not constant: outages and surges move the target. A fixed schedule drifts by 7.04% on average and ends the day 6.0% under plan.

## 4. Baseline against the stronger design

A PID pacer with anti-windup tracks to 2.54%, a 64% reduction. Very high gains track tighter (1.08%) but make the control signal 7.9 times noisier, which costs delivery quality. A two-hour feedback delay raises tracking error to 5.17%.

| Result | Value |
|---|---|
| Tracking error, open loop | 7.04% |
| Tracking error, PID | 2.54% |
| Reduction versus open loop | 63.9% |
| Control jitter, PID versus aggressive gains | 0.011 vs 0.087 |
| Tracking error with a two-hour feedback delay | 5.17% |

## 5. An edge case from the blueprint

**GPS loss.** drift and unsafe position. Planned response: Visual-inertial fallback and return-to-home. Write the test that replays this case through your pipeline before you tune anything.

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
| `days` | 46 |
| `steps_per_day` | 288 |
| `open_loop.tracking_rmse_pct` | 7.0418 |
| `open_loop.end_of_day_underdelivery_pct` | 6.0036 |
| `open_loop.overshoot_max_pct` | 6.7671 |
| `open_loop.oscillation` | 0 |
| `open_loop.hit_cap` | 0.5 |
| `pid.tracking_rmse_pct` | 2.5425 |
| `pid.end_of_day_underdelivery_pct` | 0.7585 |
| `pid.overshoot_max_pct` | 5.004 |
| `pid.oscillation` | 0.010925 |
| `pid.hit_cap` | 0.54348 |
| `pid_aggressive_gains.tracking_rmse_pct` | 1.0823 |
| `pid_aggressive_gains.end_of_day_underdelivery_pct` | 0.030613 |
| `pid_aggressive_gains.overshoot_max_pct` | 1.678 |
| `pid_aggressive_gains.oscillation` | 0.086633 |
| `pid_aggressive_gains.hit_cap` | 0.58696 |
| `pid_with_two_hour_feedback_delay.tracking_rmse_pct` | 5.1662 |
| `pid_with_two_hour_feedback_delay.end_of_day_underdelivery_pct` | 1.5802 |
| `pid_with_two_hour_feedback_delay.overshoot_max_pct` | 12.095 |
| `pid_with_two_hour_feedback_delay.oscillation` | 0.017588 |
| `pid_with_two_hour_feedback_delay.hit_cap` | 0.58696 |
| `rmse_reduction_vs_open_loop` | 0.63894 |

</details>
