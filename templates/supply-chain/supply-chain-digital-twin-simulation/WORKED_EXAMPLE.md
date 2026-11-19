# Supply-Chain Digital Twin & Scenario Simulation: worked example

> Run on synthetic data with `control` engine, seed 38036, knobs {"days": 48}, in 1.4 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Maintain a calibrated simulation of the end-to-end network to test policies and disruption responses before applying them.

**Constraints that shape the design.** Calibration to observed KPIs; Simulate months in minutes; Scenario library

**Label in this use case.** For "Supply-Chain Digital Twin & Scenario Simulation": Maintain a calibrated simulation of the end-to-end network to test policies and disruption responses before applying them. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Calibration and validation on same period.

## 2. Choose the signals

Your strongest signal is **Calibrated lead-time distributions** (fitted per lane). Its rule: Data quality. In the starter, the closest executable idea is **cumulative delivery**: what has been delivered so far, seen after a delay. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Opportunity is not constant: outages and surges move the target. A fixed schedule drifts by 5.99% on average and ends the day 3.4% under plan.

## 4. Baseline against the stronger design

A PID pacer with anti-windup tracks to 2.30%, a 62% reduction. Very high gains track tighter (0.91%) but make the control signal 8.2 times noisier, which costs delivery quality. A two-hour feedback delay raises tracking error to 5.13%.

| Result | Value |
|---|---|
| Tracking error, open loop | 5.99% |
| Tracking error, PID | 2.30% |
| Reduction versus open loop | 61.6% |
| Control jitter, PID versus aggressive gains | 0.011 vs 0.087 |
| Tracking error with a two-hour feedback delay | 5.13% |

## 5. An edge case from the blueprint

**Structural change in network (new DC).** calibration invalid. Planned response: Structural-change flags and recalibration. Write the test that replays this case through your pipeline before you tune anything.

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
| `days` | 48 |
| `steps_per_day` | 288 |
| `open_loop.tracking_rmse_pct` | 5.9937 |
| `open_loop.end_of_day_underdelivery_pct` | 3.355 |
| `open_loop.overshoot_max_pct` | 7.4834 |
| `open_loop.oscillation` | 0 |
| `open_loop.hit_cap` | 0.58333 |
| `pid.tracking_rmse_pct` | 2.3015 |
| `pid.end_of_day_underdelivery_pct` | 0.78056 |
| `pid.overshoot_max_pct` | 4.9902 |
| `pid.oscillation` | 0.010618 |
| `pid.hit_cap` | 0.41667 |
| `pid_aggressive_gains.tracking_rmse_pct` | 0.90592 |
| `pid_aggressive_gains.end_of_day_underdelivery_pct` | 0.040428 |
| `pid_aggressive_gains.overshoot_max_pct` | 1.6587 |
| `pid_aggressive_gains.oscillation` | 0.087338 |
| `pid_aggressive_gains.hit_cap` | 0.5 |
| `pid_with_two_hour_feedback_delay.tracking_rmse_pct` | 5.1325 |
| `pid_with_two_hour_feedback_delay.end_of_day_underdelivery_pct` | 2.163 |
| `pid_with_two_hour_feedback_delay.overshoot_max_pct` | 12.721 |
| `pid_with_two_hour_feedback_delay.oscillation` | 0.018304 |
| `pid_with_two_hour_feedback_delay.hit_cap` | 0.47917 |
| `rmse_reduction_vs_open_loop` | 0.61601 |

</details>
