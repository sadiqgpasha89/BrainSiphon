# Data Centre Energy Optimisation: worked example

> Run on synthetic data with `control` engine, seed 75223, knobs {"days": 62}, in 2.7 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Recommend cooling and airflow set points and workload placement that lower energy use while keeping temperatures inside equipment limits, tested in simulation and rolled out by facility engineers.

**Constraints that shape the design.** Inlet temperatures never exceed vendor limits; Set point changes limited to 1 degree per hour; Facility engineers approve changes

**Label in this use case.** For "Data Centre Energy Optimisation": Recommend cooling and airflow set points and workload placement that lower energy use while keeping temperatures inside equipment limits, tested in simulation and rolled out by facility engineers. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Lowest temperature as the goal.

## 2. Choose the signals

Your strongest signal is **Inlet temperature by rack** (temperature at servers). Its rule: From sensors. In the starter, the closest executable idea is **cumulative delivery**: what has been delivered so far, seen after a delay. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Opportunity is not constant: outages and surges move the target. A fixed schedule drifts by 5.69% on average and ends the day 4.0% under plan.

## 4. Baseline against the stronger design

A PID pacer with anti-windup tracks to 2.55%, a 55% reduction. Very high gains track tighter (1.06%) but make the control signal 7.5 times noisier, which costs delivery quality. A two-hour feedback delay raises tracking error to 5.12%.

| Result | Value |
|---|---|
| Tracking error, open loop | 5.69% |
| Tracking error, PID | 2.55% |
| Reduction versus open loop | 55.1% |
| Control jitter, PID versus aggressive gains | 0.012 vs 0.090 |
| Tracking error with a two-hour feedback delay | 5.12% |

## 5. An edge case from the blueprint

**Sensor failure.** a temperature sensor drifts. Planned response: Cross-checks and fail-safe. Write the test that replays this case through your pipeline before you tune anything.

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
| `days` | 62 |
| `steps_per_day` | 288 |
| `open_loop.tracking_rmse_pct` | 5.687 |
| `open_loop.end_of_day_underdelivery_pct` | 3.9506 |
| `open_loop.overshoot_max_pct` | 6.9314 |
| `open_loop.oscillation` | 0 |
| `open_loop.hit_cap` | 0.56452 |
| `pid.tracking_rmse_pct` | 2.5515 |
| `pid.end_of_day_underdelivery_pct` | 0.92767 |
| `pid.overshoot_max_pct` | 5.8993 |
| `pid.oscillation` | 0.012069 |
| `pid.hit_cap` | 0.3871 |
| `pid_aggressive_gains.tracking_rmse_pct` | 1.0637 |
| `pid_aggressive_gains.end_of_day_underdelivery_pct` | 0.033525 |
| `pid_aggressive_gains.overshoot_max_pct` | 1.9318 |
| `pid_aggressive_gains.oscillation` | 0.090419 |
| `pid_aggressive_gains.hit_cap` | 0.51613 |
| `pid_with_two_hour_feedback_delay.tracking_rmse_pct` | 5.1173 |
| `pid_with_two_hour_feedback_delay.end_of_day_underdelivery_pct` | 1.1022 |
| `pid_with_two_hour_feedback_delay.overshoot_max_pct` | 13.402 |
| `pid_with_two_hour_feedback_delay.oscillation` | 0.018357 |
| `pid_with_two_hour_feedback_delay.hit_cap` | 0.59677 |
| `rmse_reduction_vs_open_loop` | 0.55135 |

</details>
