# Asset Replacement Prioritisation: worked example

> Run on synthetic data with `control` engine, seed 80058, knobs {"days": 68}, in 2.8 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Rank assets for replacement or refurbishment under a capital budget by balancing failure risk, consequence and cost across the network.

**Constraints that shape the design.** Budget and outage-window limits respected; Planners can lock or exclude assets; Every ranking shows its drivers

**Label in this use case.** For "Asset Replacement Prioritisation": Rank assets for replacement or refurbishment under a capital budget by balancing failure risk, consequence and cost across the network. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Highest risk first only.

## 2. Choose the signals

Your strongest signal is **Failure probability** (calibrated failure probability by asset). Its rule: From health models. In the starter, the closest executable idea is **cumulative delivery**: what has been delivered so far, seen after a delay. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Opportunity is not constant: outages and surges move the target. A fixed schedule drifts by 6.42% on average and ends the day 3.5% under plan.

## 4. Baseline against the stronger design

A PID pacer with anti-windup tracks to 2.76%, a 57% reduction. Very high gains track tighter (1.17%) but make the control signal 7.3 times noisier, which costs delivery quality. A two-hour feedback delay raises tracking error to 5.66%.

| Result | Value |
|---|---|
| Tracking error, open loop | 6.42% |
| Tracking error, PID | 2.76% |
| Reduction versus open loop | 57.0% |
| Control jitter, PID versus aggressive gains | 0.013 vs 0.092 |
| Tracking error with a two-hour feedback delay | 5.66% |

## 5. An edge case from the blueprint

**Budget cut.** the capital pool shrinks. Planned response: Re-optimisation with a comparison to the previous plan. Write the test that replays this case through your pipeline before you tune anything.

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
| `days` | 68 |
| `steps_per_day` | 288 |
| `open_loop.tracking_rmse_pct` | 6.4244 |
| `open_loop.end_of_day_underdelivery_pct` | 3.544 |
| `open_loop.overshoot_max_pct` | 7.0113 |
| `open_loop.oscillation` | 0 |
| `open_loop.hit_cap` | 0.52941 |
| `pid.tracking_rmse_pct` | 2.7601 |
| `pid.end_of_day_underdelivery_pct` | 1.0501 |
| `pid.overshoot_max_pct` | 6.0952 |
| `pid.oscillation` | 0.012527 |
| `pid.hit_cap` | 0.33824 |
| `pid_aggressive_gains.tracking_rmse_pct` | 1.1657 |
| `pid_aggressive_gains.end_of_day_underdelivery_pct` | 0.036057 |
| `pid_aggressive_gains.overshoot_max_pct` | 2.1031 |
| `pid_aggressive_gains.oscillation` | 0.091556 |
| `pid_aggressive_gains.hit_cap` | 0.57353 |
| `pid_with_two_hour_feedback_delay.tracking_rmse_pct` | 5.6564 |
| `pid_with_two_hour_feedback_delay.end_of_day_underdelivery_pct` | 2.1494 |
| `pid_with_two_hour_feedback_delay.overshoot_max_pct` | 13.711 |
| `pid_with_two_hour_feedback_delay.oscillation` | 0.019741 |
| `pid_with_two_hour_feedback_delay.hit_cap` | 0.55882 |
| `rmse_reduction_vs_open_loop` | 0.57037 |

</details>
