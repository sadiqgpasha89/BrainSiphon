# Market-Making Quote Optimisation: worked example

> Run on synthetic data with `control` engine, seed 59909, knobs {"days": 74}, in 1.0 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Quote bid and ask prices that earn spread while controlling inventory and adverse selection.

**Constraints that shape the design.** Quote update under 1 ms; Inventory and loss limits; Exchange message rate caps

**Label in this use case.** For "Market-Making Quote Optimisation": Quote bid and ask prices that earn spread while controlling inventory and adverse selection. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Replay ignores queue position effects.

## 2. Choose the signals

Your strongest signal is **Queue position and size** (estimated position in queue at best price). Its rule: Estimate from own order events. In the starter, the closest executable idea is **cumulative delivery**: what has been delivered so far, seen after a delay. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Opportunity is not constant: outages and surges move the target. A fixed schedule drifts by 5.63% on average and ends the day 4.2% under plan.

## 4. Baseline against the stronger design

A PID pacer with anti-windup tracks to 2.22%, a 61% reduction. Very high gains track tighter (0.98%) but make the control signal 8.4 times noisier, which costs delivery quality. A two-hour feedback delay raises tracking error to 4.99%.

| Result | Value |
|---|---|
| Tracking error, open loop | 5.63% |
| Tracking error, PID | 2.22% |
| Reduction versus open loop | 60.5% |
| Control jitter, PID versus aggressive gains | 0.010 vs 0.082 |
| Tracking error with a two-hour feedback delay | 4.99% |

## 5. An edge case from the blueprint

**Exchange sends stale data.** quotes against old prices. Planned response: Sequence-gap detection with quote pull. Write the test that replays this case through your pipeline before you tune anything.

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
| `days` | 74 |
| `steps_per_day` | 288 |
| `open_loop.tracking_rmse_pct` | 5.6282 |
| `open_loop.end_of_day_underdelivery_pct` | 4.2339 |
| `open_loop.overshoot_max_pct` | 6.2429 |
| `open_loop.oscillation` | 0 |
| `open_loop.hit_cap` | 0.62162 |
| `pid.tracking_rmse_pct` | 2.221 |
| `pid.end_of_day_underdelivery_pct` | 0.71695 |
| `pid.overshoot_max_pct` | 4.5138 |
| `pid.oscillation` | 0.0097596 |
| `pid.hit_cap` | 0.33784 |
| `pid_aggressive_gains.tracking_rmse_pct` | 0.98426 |
| `pid_aggressive_gains.end_of_day_underdelivery_pct` | 0.034242 |
| `pid_aggressive_gains.overshoot_max_pct` | 1.479 |
| `pid_aggressive_gains.oscillation` | 0.081686 |
| `pid_aggressive_gains.hit_cap` | 0.55405 |
| `pid_with_two_hour_feedback_delay.tracking_rmse_pct` | 4.9942 |
| `pid_with_two_hour_feedback_delay.end_of_day_underdelivery_pct` | 1.4313 |
| `pid_with_two_hour_feedback_delay.overshoot_max_pct` | 11.985 |
| `pid_with_two_hour_feedback_delay.oscillation` | 0.016973 |
| `pid_with_two_hour_feedback_delay.hit_cap` | 0.56757 |
| `rmse_reduction_vs_open_loop` | 0.60538 |

</details>
