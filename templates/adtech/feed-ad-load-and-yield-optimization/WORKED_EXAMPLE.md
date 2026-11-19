# Feed Ad Load & Yield Optimisation: worked example

> Run on synthetic data with `control` engine, seed 51206, knobs {"days": 59}, in 0.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Decide how many ads to show and where in a feed so that long-term revenue is maximised without degrading user engagement.

**Constraints that shape the design.** Long-term user health; Fairness to advertisers; Real-time decision per request

**Label in this use case.** For "Feed Ad Load & Yield Optimisation": Decide how many ads to show and where in a feed so that long-term revenue is maximised without degrading user engagement. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: A/B tests too short to see retention effects.

## 2. Choose the signals

Your strongest signal is **User ad tolerance** (historical engagement drop after ads). Its rule: Experiments. In the starter, the closest executable idea is **cumulative delivery**: what has been delivered so far, seen after a delay. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Opportunity is not constant: outages and surges move the target. A fixed schedule drifts by 6.72% on average and ends the day 4.8% under plan.

## 4. Baseline against the stronger design

A PID pacer with anti-windup tracks to 2.36%, a 65% reduction. Very high gains track tighter (0.98%) but make the control signal 8.2 times noisier, which costs delivery quality. A two-hour feedback delay raises tracking error to 5.39%.

| Result | Value |
|---|---|
| Tracking error, open loop | 6.72% |
| Tracking error, PID | 2.36% |
| Reduction versus open loop | 64.8% |
| Control jitter, PID versus aggressive gains | 0.011 vs 0.091 |
| Tracking error with a two-hour feedback delay | 5.39% |

## 5. An edge case from the blueprint

**Short-term gains from aggressive ad load.** retention declines months later. Planned response: Long-term holdouts and surrogate indices. Write the test that replays this case through your pipeline before you tune anything.

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
| `days` | 59 |
| `steps_per_day` | 288 |
| `open_loop.tracking_rmse_pct` | 6.7195 |
| `open_loop.end_of_day_underdelivery_pct` | 4.8428 |
| `open_loop.overshoot_max_pct` | 8.4625 |
| `open_loop.oscillation` | 0 |
| `open_loop.hit_cap` | 0.59322 |
| `pid.tracking_rmse_pct` | 2.362 |
| `pid.end_of_day_underdelivery_pct` | 0.84661 |
| `pid.overshoot_max_pct` | 4.9366 |
| `pid.oscillation` | 0.011154 |
| `pid.hit_cap` | 0.33898 |
| `pid_aggressive_gains.tracking_rmse_pct` | 0.98432 |
| `pid_aggressive_gains.end_of_day_underdelivery_pct` | 0.030069 |
| `pid_aggressive_gains.overshoot_max_pct` | 1.8198 |
| `pid_aggressive_gains.oscillation` | 0.091156 |
| `pid_aggressive_gains.hit_cap` | 0.62712 |
| `pid_with_two_hour_feedback_delay.tracking_rmse_pct` | 5.3886 |
| `pid_with_two_hour_feedback_delay.end_of_day_underdelivery_pct` | 2.4503 |
| `pid_with_two_hour_feedback_delay.overshoot_max_pct` | 12.646 |
| `pid_with_two_hour_feedback_delay.oscillation` | 0.018213 |
| `pid_with_two_hour_feedback_delay.hit_cap` | 0.54237 |
| `rmse_reduction_vs_open_loop` | 0.64849 |

</details>
