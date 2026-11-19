# Patient Digital Twin for Treatment Response: worked example

> Run on synthetic data with `control` engine, seed 41583, knobs {"days": 52}, in 1.4 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Simulate individual patient trajectories under alternative treatments using causal models to support shared decision making.

**Constraints that shape the design.** Causal validity; Uncertainty communicated; Clinician-in-the-loop

**Label in this use case.** For "Patient Digital Twin for Treatment Response": Simulate individual patient trajectories under alternative treatments using causal models to support shared decision making. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on treated patients only.

## 2. Choose the signals

Your strongest signal is **Pre-treatment covariate balance** (propensity overlap diagnostics). Its rule: Overlap assumption. In the starter, the closest executable idea is **cumulative delivery**: what has been delivered so far, seen after a delay. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Opportunity is not constant: outages and surges move the target. A fixed schedule drifts by 6.05% on average and ends the day 3.3% under plan.

## 4. Baseline against the stronger design

A PID pacer with anti-windup tracks to 2.75%, a 54% reduction. Very high gains track tighter (1.04%) but make the control signal 7.4 times noisier, which costs delivery quality. A two-hour feedback delay raises tracking error to 5.66%.

| Result | Value |
|---|---|
| Tracking error, open loop | 6.05% |
| Tracking error, PID | 2.75% |
| Reduction versus open loop | 54.5% |
| Control jitter, PID versus aggressive gains | 0.012 vs 0.090 |
| Tracking error with a two-hour feedback delay | 5.66% |

## 5. An edge case from the blueprint

**Hidden confounders.** biased individual effects. Planned response: Sensitivity analyses and trial anchoring. Write the test that replays this case through your pipeline before you tune anything.

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
| `open_loop.tracking_rmse_pct` | 6.0522 |
| `open_loop.end_of_day_underdelivery_pct` | 3.2672 |
| `open_loop.overshoot_max_pct` | 6.745 |
| `open_loop.oscillation` | 0 |
| `open_loop.hit_cap` | 0.61538 |
| `pid.tracking_rmse_pct` | 2.7542 |
| `pid.end_of_day_underdelivery_pct` | 0.83187 |
| `pid.overshoot_max_pct` | 5.8999 |
| `pid.oscillation` | 0.012201 |
| `pid.hit_cap` | 0.48077 |
| `pid_aggressive_gains.tracking_rmse_pct` | 1.0391 |
| `pid_aggressive_gains.end_of_day_underdelivery_pct` | 0.0732 |
| `pid_aggressive_gains.overshoot_max_pct` | 1.7924 |
| `pid_aggressive_gains.oscillation` | 0.090225 |
| `pid_aggressive_gains.hit_cap` | 0.42308 |
| `pid_with_two_hour_feedback_delay.tracking_rmse_pct` | 5.6585 |
| `pid_with_two_hour_feedback_delay.end_of_day_underdelivery_pct` | 2.6241 |
| `pid_with_two_hour_feedback_delay.overshoot_max_pct` | 13.416 |
| `pid_with_two_hour_feedback_delay.oscillation` | 0.019584 |
| `pid_with_two_hour_feedback_delay.hit_cap` | 0.55769 |
| `rmse_reduction_vs_open_loop` | 0.54493 |

</details>
