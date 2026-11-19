# Campaign Budget Pacing: worked example

> Run on synthetic data with `control` engine, seed 34078, knobs {"days": 53}, in 0.8 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Spread campaign spend smoothly over the flight so budgets neither exhaust early nor underdeliver, adapting to traffic fluctuations.

**Constraints that shape the design.** Overspend tolerance under 1%; Decision on every bid; Multi-campaign interactions

**Label in this use case.** For "Campaign Budget Pacing": Spread campaign spend smoothly over the flight so budgets neither exhaust early nor underdeliver, adapting to traffic fluctuations. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Testing controllers on smooth traffic only.

## 2. Choose the signals

Your strongest signal is **Spend error vs target curve** (actual minus ideal cumulative spend). Its rule: Distributed counters lag. In the starter, the closest executable idea is **cumulative delivery**: what has been delivered so far, seen after a delay. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Opportunity is not constant: outages and surges move the target. A fixed schedule drifts by 6.47% on average and ends the day 4.5% under plan.

## 4. Baseline against the stronger design

A PID pacer with anti-windup tracks to 2.66%, a 59% reduction. Very high gains track tighter (1.13%) but make the control signal 7.5 times noisier, which costs delivery quality. A two-hour feedback delay raises tracking error to 5.52%.

| Result | Value |
|---|---|
| Tracking error, open loop | 6.47% |
| Tracking error, PID | 2.66% |
| Reduction versus open loop | 59.0% |
| Control jitter, PID versus aggressive gains | 0.011 vs 0.086 |
| Tracking error with a two-hour feedback delay | 5.52% |

## 5. An edge case from the blueprint

**Counter lag across data centres allows overspend.** the budget is exceeded in minutes. Planned response: Conservative global limits and per-region reservations. Write the test that replays this case through your pipeline before you tune anything.

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
| `days` | 53 |
| `steps_per_day` | 288 |
| `open_loop.tracking_rmse_pct` | 6.475 |
| `open_loop.end_of_day_underdelivery_pct` | 4.5007 |
| `open_loop.overshoot_max_pct` | 7.3502 |
| `open_loop.oscillation` | 0 |
| `open_loop.hit_cap` | 0.60377 |
| `pid.tracking_rmse_pct` | 2.6553 |
| `pid.end_of_day_underdelivery_pct` | 0.94957 |
| `pid.overshoot_max_pct` | 5.5345 |
| `pid.oscillation` | 0.011415 |
| `pid.hit_cap` | 0.43396 |
| `pid_aggressive_gains.tracking_rmse_pct` | 1.1261 |
| `pid_aggressive_gains.end_of_day_underdelivery_pct` | 0.055437 |
| `pid_aggressive_gains.overshoot_max_pct` | 1.7873 |
| `pid_aggressive_gains.oscillation` | 0.086014 |
| `pid_aggressive_gains.hit_cap` | 0.4717 |
| `pid_with_two_hour_feedback_delay.tracking_rmse_pct` | 5.5176 |
| `pid_with_two_hour_feedback_delay.end_of_day_underdelivery_pct` | 2.4013 |
| `pid_with_two_hour_feedback_delay.overshoot_max_pct` | 13.309 |
| `pid_with_two_hour_feedback_delay.oscillation` | 0.018656 |
| `pid_with_two_hour_feedback_delay.hit_cap` | 0.58491 |
| `rmse_reduction_vs_open_loop` | 0.58992 |

</details>
