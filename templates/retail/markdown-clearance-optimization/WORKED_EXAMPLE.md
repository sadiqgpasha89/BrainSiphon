# Markdown & Clearance Optimisation: worked example

> Run on synthetic data with `control` engine, seed 81029, knobs {"days": 67}, in 0.9 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Choose markdown depth and timing to sell through end-of-season stock at maximum recovery before a cut-off date.

**Constraints that shape the design.** Terminal inventory target; Markdown cadence rules; Store-level execution

**Label in this use case.** For "Markdown & Clearance Optimisation": Choose markdown depth and timing to sell through end-of-season stock at maximum recovery before a cut-off date. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Backtests using realised future stock.

## 2. Choose the signals

Your strongest signal is **Sell-through rate to date** (units sold over initial units). Its rule: As-of snapshot. In the starter, the closest executable idea is **cumulative delivery**: what has been delivered so far, seen after a delay. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Opportunity is not constant: outages and surges move the target. A fixed schedule drifts by 6.22% on average and ends the day 4.7% under plan.

## 4. Baseline against the stronger design

A PID pacer with anti-windup tracks to 2.60%, a 58% reduction. Very high gains track tighter (1.08%) but make the control signal 7.6 times noisier, which costs delivery quality. A two-hour feedback delay raises tracking error to 5.56%.

| Result | Value |
|---|---|
| Tracking error, open loop | 6.22% |
| Tracking error, PID | 2.60% |
| Reduction versus open loop | 58.2% |
| Control jitter, PID versus aggressive gains | 0.011 vs 0.087 |
| Tracking error with a two-hour feedback delay | 5.56% |

## 5. An edge case from the blueprint

**Supply chain delay shifts arrivals.** late stock marked down early. Planned response: Arrival-date aware model and delay buffers. Write the test that replays this case through your pipeline before you tune anything.

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
| `days` | 67 |
| `steps_per_day` | 288 |
| `open_loop.tracking_rmse_pct` | 6.2225 |
| `open_loop.end_of_day_underdelivery_pct` | 4.6567 |
| `open_loop.overshoot_max_pct` | 7.7246 |
| `open_loop.oscillation` | 0 |
| `open_loop.hit_cap` | 0.55224 |
| `pid.tracking_rmse_pct` | 2.6005 |
| `pid.end_of_day_underdelivery_pct` | 1.247 |
| `pid.overshoot_max_pct` | 5.7809 |
| `pid.oscillation` | 0.011467 |
| `pid.hit_cap` | 0.26866 |
| `pid_aggressive_gains.tracking_rmse_pct` | 1.0787 |
| `pid_aggressive_gains.end_of_day_underdelivery_pct` | 0.036961 |
| `pid_aggressive_gains.overshoot_max_pct` | 1.7115 |
| `pid_aggressive_gains.oscillation` | 0.087206 |
| `pid_aggressive_gains.hit_cap` | 0.38806 |
| `pid_with_two_hour_feedback_delay.tracking_rmse_pct` | 5.5606 |
| `pid_with_two_hour_feedback_delay.end_of_day_underdelivery_pct` | 2.0343 |
| `pid_with_two_hour_feedback_delay.overshoot_max_pct` | 14.003 |
| `pid_with_two_hour_feedback_delay.oscillation` | 0.018553 |
| `pid_with_two_hour_feedback_delay.hit_cap` | 0.59701 |
| `rmse_reduction_vs_open_loop` | 0.58208 |

</details>
