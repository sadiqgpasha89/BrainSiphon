# Traffic Signal Timing Optimisation: worked example

> Run on synthetic data with `control` engine, seed 46939, knobs {"days": 55}, in 2.6 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Adapt traffic signal timings to current flow so delays and emissions fall, within safety rules and with priority for buses, cyclists and pedestrians where policy requires it.

**Constraints that shape the design.** Minimum green, clearance and pedestrian times enforced in the controller; Plans tested in simulation before use; Operators can revert at once

**Label in this use case.** For "Traffic Signal Timing Optimisation": Adapt traffic signal timings to current flow so delays and emissions fall, within safety rules and with priority for buses, cyclists and pedestrians where policy requires it. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Learned safety limits.

## 2. Choose the signals

Your strongest signal is **Detector counts and occupancy** (flow and occupancy by approach). Its rule: From detectors. In the starter, the closest executable idea is **cumulative delivery**: what has been delivered so far, seen after a delay. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Opportunity is not constant: outages and surges move the target. A fixed schedule drifts by 6.19% on average and ends the day 3.9% under plan.

## 4. Baseline against the stronger design

A PID pacer with anti-windup tracks to 2.70%, a 56% reduction. Very high gains track tighter (1.09%) but make the control signal 8.0 times noisier, which costs delivery quality. A two-hour feedback delay raises tracking error to 5.48%.

| Result | Value |
|---|---|
| Tracking error, open loop | 6.19% |
| Tracking error, PID | 2.70% |
| Reduction versus open loop | 56.4% |
| Control jitter, PID versus aggressive gains | 0.012 vs 0.094 |
| Tracking error with a two-hour feedback delay | 5.48% |

## 5. An edge case from the blueprint

**Detector failure.** counts are missing. Planned response: Fallback to the fixed plan. Write the test that replays this case through your pipeline before you tune anything.

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
| `days` | 55 |
| `steps_per_day` | 288 |
| `open_loop.tracking_rmse_pct` | 6.1925 |
| `open_loop.end_of_day_underdelivery_pct` | 3.9357 |
| `open_loop.overshoot_max_pct` | 7.7206 |
| `open_loop.oscillation` | 0 |
| `open_loop.hit_cap` | 0.6 |
| `pid.tracking_rmse_pct` | 2.6981 |
| `pid.end_of_day_underdelivery_pct` | 1.27 |
| `pid.overshoot_max_pct` | 5.7671 |
| `pid.oscillation` | 0.011747 |
| `pid.hit_cap` | 0.34545 |
| `pid_aggressive_gains.tracking_rmse_pct` | 1.0863 |
| `pid_aggressive_gains.end_of_day_underdelivery_pct` | 0.034545 |
| `pid_aggressive_gains.overshoot_max_pct` | 1.9009 |
| `pid_aggressive_gains.oscillation` | 0.093776 |
| `pid_aggressive_gains.hit_cap` | 0.52727 |
| `pid_with_two_hour_feedback_delay.tracking_rmse_pct` | 5.4787 |
| `pid_with_two_hour_feedback_delay.end_of_day_underdelivery_pct` | 2.1557 |
| `pid_with_two_hour_feedback_delay.overshoot_max_pct` | 13.435 |
| `pid_with_two_hour_feedback_delay.oscillation` | 0.01796 |
| `pid_with_two_hour_feedback_delay.hit_cap` | 0.54545 |
| `rmse_reduction_vs_open_loop` | 0.5643 |

</details>
