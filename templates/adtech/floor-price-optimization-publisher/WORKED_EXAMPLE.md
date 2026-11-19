# Publisher Floor-Price Optimisation: worked example

> Run on synthetic data with `control` engine, seed 59176, knobs {"days": 52}, in 0.8 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Set per-impression floor prices to raise publisher yield without suppressing fill or driving buyers away.

**Constraints that shape the design.** Latency 30 ms; Buyer fairness; Header-bidding complexity

**Label in this use case.** For "Publisher Floor-Price Optimisation": Set per-impression floor prices to raise publisher yield without suppressing fill or driving buyers away. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Counterfactual revenue using bids from different floors.

## 2. Choose the signals

Your strongest signal is **Predicted top-bid distribution** (quantiles of the highest bid). Its rule: Censored by earlier floors. In the starter, the closest executable idea is **cumulative delivery**: what has been delivered so far, seen after a delay. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Opportunity is not constant: outages and surges move the target. A fixed schedule drifts by 6.32% on average and ends the day 4.5% under plan.

## 4. Baseline against the stronger design

A PID pacer with anti-windup tracks to 2.53%, a 60% reduction. Very high gains track tighter (1.04%) but make the control signal 8.0 times noisier, which costs delivery quality. A two-hour feedback delay raises tracking error to 5.22%.

| Result | Value |
|---|---|
| Tracking error, open loop | 6.32% |
| Tracking error, PID | 2.53% |
| Reduction versus open loop | 60.0% |
| Control jitter, PID versus aggressive gains | 0.011 vs 0.090 |
| Tracking error with a two-hour feedback delay | 5.22% |

## 5. An edge case from the blueprint

**Demand partners reduce bids after repeated high floors.** yield declines after initial gains. Planned response: Long-horizon holdouts and elasticity monitoring. Write the test that replays this case through your pipeline before you tune anything.

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
| `days` | 52 |
| `steps_per_day` | 288 |
| `open_loop.tracking_rmse_pct` | 6.3236 |
| `open_loop.end_of_day_underdelivery_pct` | 4.5389 |
| `open_loop.overshoot_max_pct` | 7.35 |
| `open_loop.oscillation` | 0 |
| `open_loop.hit_cap` | 0.53846 |
| `pid.tracking_rmse_pct` | 2.5304 |
| `pid.end_of_day_underdelivery_pct` | 0.88944 |
| `pid.overshoot_max_pct` | 5.5293 |
| `pid.oscillation` | 0.011308 |
| `pid.hit_cap` | 0.40385 |
| `pid_aggressive_gains.tracking_rmse_pct` | 1.0448 |
| `pid_aggressive_gains.end_of_day_underdelivery_pct` | 0.037754 |
| `pid_aggressive_gains.overshoot_max_pct` | 1.8142 |
| `pid_aggressive_gains.oscillation` | 0.090126 |
| `pid_aggressive_gains.hit_cap` | 0.48077 |
| `pid_with_two_hour_feedback_delay.tracking_rmse_pct` | 5.2163 |
| `pid_with_two_hour_feedback_delay.end_of_day_underdelivery_pct` | 1.149 |
| `pid_with_two_hour_feedback_delay.overshoot_max_pct` | 13.224 |
| `pid_with_two_hour_feedback_delay.oscillation` | 0.017887 |
| `pid_with_two_hour_feedback_delay.hit_cap` | 0.71154 |
| `rmse_reduction_vs_open_loop` | 0.59984 |

</details>
