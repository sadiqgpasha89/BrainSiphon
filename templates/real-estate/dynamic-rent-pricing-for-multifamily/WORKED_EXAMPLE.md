# Dynamic Rent Pricing for Multifamily: worked example

> Run on synthetic data with `control` engine, seed 68966, knobs {"days": 69}, in 1.3 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Set daily asking rents by unit type to maximise revenue subject to occupancy and fairness rules.

**Constraints that shape the design.** Rent-control and regulatory limits are hard constraints; No exchange or use of non-public competitor data; Daily price changes capped within a stated range

**Label in this use case.** For "Dynamic Rent Pricing for Multifamily": Set daily asking rents by unit type to maximise revenue subject to occupancy and fairness rules. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: A simulated demand curve is optimistic about how tenants react to price.

## 2. Choose the signals

Your strongest signal is **Inquiry velocity** (enquiries per day for the unit type over 7 days divided by the 28-day mean). Its rule: Noise from marketing campaigns, so adjust for ad spend. In the starter, the closest executable idea is **cumulative delivery**: what has been delivered so far, seen after a delay. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Opportunity is not constant: outages and surges move the target. A fixed schedule drifts by 6.31% on average and ends the day 3.9% under plan.

## 4. Baseline against the stronger design

A PID pacer with anti-windup tracks to 2.75%, a 56% reduction. Very high gains track tighter (1.17%) but make the control signal 7.5 times noisier, which costs delivery quality. A two-hour feedback delay raises tracking error to 5.54%.

| Result | Value |
|---|---|
| Tracking error, open loop | 6.31% |
| Tracking error, PID | 2.75% |
| Reduction versus open loop | 56.4% |
| Control jitter, PID versus aggressive gains | 0.012 vs 0.091 |
| Tracking error with a two-hour feedback delay | 5.54% |

## 5. An edge case from the blueprint

**Rent control.** Rent-control law caps rent and the price policy suggests more. Planned response: Enforce the cap as a hard rule in the pricing policy. Write the test that replays this case through your pipeline before you tune anything.

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
| `days` | 69 |
| `steps_per_day` | 288 |
| `open_loop.tracking_rmse_pct` | 6.3079 |
| `open_loop.end_of_day_underdelivery_pct` | 3.9265 |
| `open_loop.overshoot_max_pct` | 7.5086 |
| `open_loop.oscillation` | 0 |
| `open_loop.hit_cap` | 0.5942 |
| `pid.tracking_rmse_pct` | 2.7533 |
| `pid.end_of_day_underdelivery_pct` | 0.94962 |
| `pid.overshoot_max_pct` | 5.8145 |
| `pid.oscillation` | 0.012042 |
| `pid.hit_cap` | 0.33333 |
| `pid_aggressive_gains.tracking_rmse_pct` | 1.168 |
| `pid_aggressive_gains.end_of_day_underdelivery_pct` | 0.046339 |
| `pid_aggressive_gains.overshoot_max_pct` | 1.9273 |
| `pid_aggressive_gains.oscillation` | 0.090514 |
| `pid_aggressive_gains.hit_cap` | 0.42029 |
| `pid_with_two_hour_feedback_delay.tracking_rmse_pct` | 5.5397 |
| `pid_with_two_hour_feedback_delay.end_of_day_underdelivery_pct` | 1.8511 |
| `pid_with_two_hour_feedback_delay.overshoot_max_pct` | 13.998 |
| `pid_with_two_hour_feedback_delay.oscillation` | 0.019297 |
| `pid_with_two_hour_feedback_delay.hit_cap` | 0.63768 |
| `rmse_reduction_vs_open_loop` | 0.56352 |

</details>
