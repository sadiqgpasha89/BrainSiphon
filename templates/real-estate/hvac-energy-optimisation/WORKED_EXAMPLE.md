# HVAC Energy Optimisation: worked example

> Run on synthetic data with `control` engine, seed 81507, knobs {"days": 43}, in 0.8 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Control heating and cooling setpoints to cut energy use while keeping comfort within limits.

**Constraints that shape the design.** Zone temperature and air quality stay within comfort bounds at all times; Safety interlocks on equipment always take priority over the controller; The controller falls back to the BMS schedule on any fault

**Label in this use case.** For "HVAC Energy Optimisation": Control heating and cooling setpoints to cut energy use while keeping comfort within limits. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: A simulator that does not match the real building gives gains that vanish on site.

## 2. Choose the signals

Your strongest signal is **Zone temperature** (measured air temperature per zone with a sensor-quality flag). Its rule: Sensors are noisy and can be placed badly. In the starter, the closest executable idea is **cumulative delivery**: what has been delivered so far, seen after a delay. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Opportunity is not constant: outages and surges move the target. A fixed schedule drifts by 6.40% on average and ends the day 3.9% under plan.

## 4. Baseline against the stronger design

A PID pacer with anti-windup tracks to 2.64%, a 59% reduction. Very high gains track tighter (1.10%) but make the control signal 7.7 times noisier, which costs delivery quality. A two-hour feedback delay raises tracking error to 5.54%.

| Result | Value |
|---|---|
| Tracking error, open loop | 6.40% |
| Tracking error, PID | 2.64% |
| Reduction versus open loop | 58.7% |
| Control jitter, PID versus aggressive gains | 0.012 vs 0.089 |
| Tracking error with a two-hour feedback delay | 5.54% |

## 5. An edge case from the blueprint

**Sensor fault.** A faulty sensor sends wrong data and the controller reacts to it. Planned response: Detect the fault and fall back to the schedule for that zone. Write the test that replays this case through your pipeline before you tune anything.

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
| `days` | 43 |
| `steps_per_day` | 288 |
| `open_loop.tracking_rmse_pct` | 6.3994 |
| `open_loop.end_of_day_underdelivery_pct` | 3.8899 |
| `open_loop.overshoot_max_pct` | 8.5288 |
| `open_loop.oscillation` | 0 |
| `open_loop.hit_cap` | 0.62791 |
| `pid.tracking_rmse_pct` | 2.6432 |
| `pid.end_of_day_underdelivery_pct` | 0.94937 |
| `pid.overshoot_max_pct` | 5.6016 |
| `pid.oscillation` | 0.011517 |
| `pid.hit_cap` | 0.32558 |
| `pid_aggressive_gains.tracking_rmse_pct` | 1.0991 |
| `pid_aggressive_gains.end_of_day_underdelivery_pct` | 0.050634 |
| `pid_aggressive_gains.overshoot_max_pct` | 1.9615 |
| `pid_aggressive_gains.oscillation` | 0.088534 |
| `pid_aggressive_gains.hit_cap` | 0.48837 |
| `pid_with_two_hour_feedback_delay.tracking_rmse_pct` | 5.5436 |
| `pid_with_two_hour_feedback_delay.end_of_day_underdelivery_pct` | 1.8926 |
| `pid_with_two_hour_feedback_delay.overshoot_max_pct` | 13.893 |
| `pid_with_two_hour_feedback_delay.oscillation` | 0.018538 |
| `pid_with_two_hour_feedback_delay.hit_cap` | 0.55814 |
| `rmse_reduction_vs_open_loop` | 0.58696 |

</details>
