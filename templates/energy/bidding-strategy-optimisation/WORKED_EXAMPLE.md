# Bidding Strategy Optimisation: worked example

> Run on synthetic data with `control` engine, seed 46249, knobs {"days": 59}, in 2.7 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Recommend bid curves for generation and storage portfolios that maximise expected margin under price uncertainty and physical constraints, as advice for traders to approve.

**Constraints that shape the design.** Physical limits such as ramp and capacity enforced outside the model; Traders approve every bid; Risk limits and exposure caps in code

**Label in this use case.** For "Bidding Strategy Optimisation": Recommend bid curves for generation and storage portfolios that maximise expected margin under price uncertainty and physical constraints, as advice for traders to approve. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Autonomous bidding.

## 2. Choose the signals

Your strongest signal is **Price scenario distribution** (scenario set from the price model). Its rule: From forecasts. In the starter, the closest executable idea is **cumulative delivery**: what has been delivered so far, seen after a delay. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Opportunity is not constant: outages and surges move the target. A fixed schedule drifts by 6.21% on average and ends the day 4.2% under plan.

## 4. Baseline against the stronger design

A PID pacer with anti-windup tracks to 2.80%, a 55% reduction. Very high gains track tighter (1.17%) but make the control signal 7.3 times noisier, which costs delivery quality. A two-hour feedback delay raises tracking error to 5.55%.

| Result | Value |
|---|---|
| Tracking error, open loop | 6.21% |
| Tracking error, PID | 2.80% |
| Reduction versus open loop | 54.9% |
| Control jitter, PID versus aggressive gains | 0.013 vs 0.092 |
| Tracking error with a two-hour feedback delay | 5.55% |

## 5. An edge case from the blueprint

**Market rule update.** bid formats change. Planned response: Versioned rules and block-on-error checks. Write the test that replays this case through your pipeline before you tune anything.

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
| `open_loop.tracking_rmse_pct` | 6.211 |
| `open_loop.end_of_day_underdelivery_pct` | 4.167 |
| `open_loop.overshoot_max_pct` | 7.4546 |
| `open_loop.oscillation` | 0 |
| `open_loop.hit_cap` | 0.64407 |
| `pid.tracking_rmse_pct` | 2.8017 |
| `pid.end_of_day_underdelivery_pct` | 0.9601 |
| `pid.overshoot_max_pct` | 6.1282 |
| `pid.oscillation` | 0.01255 |
| `pid.hit_cap` | 0.42373 |
| `pid_aggressive_gains.tracking_rmse_pct` | 1.171 |
| `pid_aggressive_gains.end_of_day_underdelivery_pct` | 0.049128 |
| `pid_aggressive_gains.overshoot_max_pct` | 2.1161 |
| `pid_aggressive_gains.oscillation` | 0.091792 |
| `pid_aggressive_gains.hit_cap` | 0.52542 |
| `pid_with_two_hour_feedback_delay.tracking_rmse_pct` | 5.5538 |
| `pid_with_two_hour_feedback_delay.end_of_day_underdelivery_pct` | 1.7732 |
| `pid_with_two_hour_feedback_delay.overshoot_max_pct` | 14.404 |
| `pid_with_two_hour_feedback_delay.oscillation` | 0.018906 |
| `pid_with_two_hour_feedback_delay.hit_cap` | 0.62712 |
| `rmse_reduction_vs_open_loop` | 0.54891 |

</details>
