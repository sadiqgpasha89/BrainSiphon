# Autoscaling Policy Optimisation: worked example

> Run on synthetic data with `control` engine, seed 16746, knobs {"days": 58}, in 2.8 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Tune autoscaling thresholds and schedules to meet latency targets at lower cost, evaluated in simulation on replayed traffic and rolled out with guardrails.

**Constraints that shape the design.** Latency objectives never traded for cost; Minimum capacity floors enforced; Policy tested in simulation before rollout

**Label in this use case.** For "Autoscaling Policy Optimisation": Tune autoscaling thresholds and schedules to meet latency targets at lower cost, evaluated in simulation on replayed traffic and rolled out with guardrails. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: CPU as the only signal.

## 2. Choose the signals

Your strongest signal is **Request rate and trend** (load and slope). Its rule: From load balancers. In the starter, the closest executable idea is **cumulative delivery**: what has been delivered so far, seen after a delay. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Opportunity is not constant: outages and surges move the target. A fixed schedule drifts by 7.82% on average and ends the day 5.0% under plan.

## 4. Baseline against the stronger design

A PID pacer with anti-windup tracks to 2.90%, a 63% reduction. Very high gains track tighter (1.27%) but make the control signal 7.7 times noisier, which costs delivery quality. A two-hour feedback delay raises tracking error to 5.97%.

| Result | Value |
|---|---|
| Tracking error, open loop | 7.82% |
| Tracking error, PID | 2.90% |
| Reduction versus open loop | 63.0% |
| Control jitter, PID versus aggressive gains | 0.012 vs 0.094 |
| Tracking error with a two-hour feedback delay | 5.97% |

## 5. An edge case from the blueprint

**Flash traffic.** load jumps faster than scaling. Planned response: Burst buffers and pre-scaling. Write the test that replays this case through your pipeline before you tune anything.

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
| `days` | 58 |
| `steps_per_day` | 288 |
| `open_loop.tracking_rmse_pct` | 7.8223 |
| `open_loop.end_of_day_underdelivery_pct` | 4.981 |
| `open_loop.overshoot_max_pct` | 8.9373 |
| `open_loop.oscillation` | 0 |
| `open_loop.hit_cap` | 0.58621 |
| `pid.tracking_rmse_pct` | 2.8979 |
| `pid.end_of_day_underdelivery_pct` | 0.80755 |
| `pid.overshoot_max_pct` | 5.9853 |
| `pid.oscillation` | 0.012218 |
| `pid.hit_cap` | 0.39655 |
| `pid_aggressive_gains.tracking_rmse_pct` | 1.2667 |
| `pid_aggressive_gains.end_of_day_underdelivery_pct` | 0.048493 |
| `pid_aggressive_gains.overshoot_max_pct` | 2.2332 |
| `pid_aggressive_gains.oscillation` | 0.094122 |
| `pid_aggressive_gains.hit_cap` | 0.43103 |
| `pid_with_two_hour_feedback_delay.tracking_rmse_pct` | 5.9654 |
| `pid_with_two_hour_feedback_delay.end_of_day_underdelivery_pct` | 1.4986 |
| `pid_with_two_hour_feedback_delay.overshoot_max_pct` | 14.896 |
| `pid_with_two_hour_feedback_delay.oscillation` | 0.019321 |
| `pid_with_two_hour_feedback_delay.hit_cap` | 0.62069 |
| `rmse_reduction_vs_open_loop` | 0.62954 |

</details>
