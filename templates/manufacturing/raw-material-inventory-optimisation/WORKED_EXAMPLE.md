# Raw Material Inventory Optimisation: worked example

> Run on synthetic data with `control` engine, seed 82215, knobs {"days": 65}, in 2.9 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Set reorder points and order quantities for raw materials under demand and lead-time uncertainty so stock-outs fall without excess inventory.

**Constraints that shape the design.** Service level targets by criticality; Supplier minimum order quantities respected; Planner approves order proposals

**Label in this use case.** For "Raw Material Inventory Optimisation": Set reorder points and order quantities for raw materials under demand and lead-time uncertainty so stock-outs fall without excess inventory. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Average-based safety stock.

## 2. Choose the signals

Your strongest signal is **Demand forecast with intervals** (quantile forecast from the production plan). Its rule: From planning. In the starter, the closest executable idea is **cumulative delivery**: what has been delivered so far, seen after a delay. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Opportunity is not constant: outages and surges move the target. A fixed schedule drifts by 6.78% on average and ends the day 5.5% under plan.

## 4. Baseline against the stronger design

A PID pacer with anti-windup tracks to 2.48%, a 63% reduction. Very high gains track tighter (1.02%) but make the control signal 8.0 times noisier, which costs delivery quality. A two-hour feedback delay raises tracking error to 5.26%.

| Result | Value |
|---|---|
| Tracking error, open loop | 6.78% |
| Tracking error, PID | 2.48% |
| Reduction versus open loop | 63.4% |
| Control jitter, PID versus aggressive gains | 0.010 vs 0.084 |
| Tracking error with a two-hour feedback delay | 5.26% |

## 5. An edge case from the blueprint

**Supplier disruption.** lead times jump. Planned response: Scenario planning and dual sourcing rules. Write the test that replays this case through your pipeline before you tune anything.

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
| `days` | 65 |
| `steps_per_day` | 288 |
| `open_loop.tracking_rmse_pct` | 6.7773 |
| `open_loop.end_of_day_underdelivery_pct` | 5.4591 |
| `open_loop.overshoot_max_pct` | 6.9456 |
| `open_loop.oscillation` | 0 |
| `open_loop.hit_cap` | 0.47692 |
| `pid.tracking_rmse_pct` | 2.4786 |
| `pid.end_of_day_underdelivery_pct` | 0.96345 |
| `pid.overshoot_max_pct` | 4.8233 |
| `pid.oscillation` | 0.010476 |
| `pid.hit_cap` | 0.43077 |
| `pid_aggressive_gains.tracking_rmse_pct` | 1.0239 |
| `pid_aggressive_gains.end_of_day_underdelivery_pct` | 0.048163 |
| `pid_aggressive_gains.overshoot_max_pct` | 1.5542 |
| `pid_aggressive_gains.oscillation` | 0.083741 |
| `pid_aggressive_gains.hit_cap` | 0.55385 |
| `pid_with_two_hour_feedback_delay.tracking_rmse_pct` | 5.2588 |
| `pid_with_two_hour_feedback_delay.end_of_day_underdelivery_pct` | 2.4541 |
| `pid_with_two_hour_feedback_delay.overshoot_max_pct` | 12.16 |
| `pid_with_two_hour_feedback_delay.oscillation` | 0.017471 |
| `pid_with_two_hour_feedback_delay.hit_cap` | 0.53846 |
| `rmse_reduction_vs_open_loop` | 0.63427 |

</details>
