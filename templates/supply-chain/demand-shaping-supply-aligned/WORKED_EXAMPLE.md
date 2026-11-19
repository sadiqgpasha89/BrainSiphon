# Supply-Aligned Demand Shaping: worked example

> Run on synthetic data with `control` engine, seed 60020, knobs {"days": 70}, in 1.6 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Shape promotions and pricing to steer demand toward items and weeks where supply is plentiful, reducing stock-outs and waste.

**Constraints that shape the design.** Brand price rules; Promotion calendars locked weeks ahead; Supply plan visibility

**Label in this use case.** For "Supply-Aligned Demand Shaping": Shape promotions and pricing to steer demand toward items and weeks where supply is plentiful, reducing stock-outs and waste. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Promo uplift from non-randomised data.

## 2. Choose the signals

Your strongest signal is **Supply availability forecast** (projected availability by week). Its rule: Supplier commitments. In the starter, the closest executable idea is **cumulative delivery**: what has been delivered so far, seen after a delay. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Opportunity is not constant: outages and surges move the target. A fixed schedule drifts by 6.36% on average and ends the day 4.5% under plan.

## 4. Baseline against the stronger design

A PID pacer with anti-windup tracks to 2.67%, a 58% reduction. Very high gains track tighter (1.19%) but make the control signal 7.5 times noisier, which costs delivery quality. A two-hour feedback delay raises tracking error to 5.58%.

| Result | Value |
|---|---|
| Tracking error, open loop | 6.36% |
| Tracking error, PID | 2.67% |
| Reduction versus open loop | 58.0% |
| Control jitter, PID versus aggressive gains | 0.012 vs 0.090 |
| Tracking error with a two-hour feedback delay | 5.58% |

## 5. An edge case from the blueprint

**Supply plan slips after promotion is locked.** promo drives stock-outs. Planned response: Contingency promo levers and early-warning triggers. Write the test that replays this case through your pipeline before you tune anything.

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
| `days` | 70 |
| `steps_per_day` | 288 |
| `open_loop.tracking_rmse_pct` | 6.3579 |
| `open_loop.end_of_day_underdelivery_pct` | 4.4907 |
| `open_loop.overshoot_max_pct` | 7.5871 |
| `open_loop.oscillation` | 0 |
| `open_loop.hit_cap` | 0.57143 |
| `pid.tracking_rmse_pct` | 2.6723 |
| `pid.end_of_day_underdelivery_pct` | 0.90719 |
| `pid.overshoot_max_pct` | 5.6293 |
| `pid.oscillation` | 0.012005 |
| `pid.hit_cap` | 0.4 |
| `pid_aggressive_gains.tracking_rmse_pct` | 1.1879 |
| `pid_aggressive_gains.end_of_day_underdelivery_pct` | 0.031726 |
| `pid_aggressive_gains.overshoot_max_pct` | 2.028 |
| `pid_aggressive_gains.oscillation` | 0.08984 |
| `pid_aggressive_gains.hit_cap` | 0.5 |
| `pid_with_two_hour_feedback_delay.tracking_rmse_pct` | 5.5762 |
| `pid_with_two_hour_feedback_delay.end_of_day_underdelivery_pct` | 2.0006 |
| `pid_with_two_hour_feedback_delay.overshoot_max_pct` | 14.001 |
| `pid_with_two_hour_feedback_delay.oscillation` | 0.019016 |
| `pid_with_two_hour_feedback_delay.hit_cap` | 0.55714 |
| `rmse_reduction_vs_open_loop` | 0.57969 |

</details>
