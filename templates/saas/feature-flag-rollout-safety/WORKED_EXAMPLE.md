# Feature-Flag Progressive Rollout with Guardrails: worked example

> Run on synthetic data with `control` engine, seed 90302, knobs {"days": 66}, in 1.6 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Automatically ramp feature flags while monitoring guardrail metrics, rolling back at the first statistically credible harm.

**Constraints that shape the design.** Guardrail metrics across many teams; Low false rollbacks; Interaction between flags

**Label in this use case.** For "Feature-Flag Progressive Rollout with Guardrails": Automatically ramp feature flags while monitoring guardrail metrics, rolling back at the first statistically credible harm. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Peeking without correction.

## 2. Choose the signals

Your strongest signal is **Guardrail metric deltas** (error rate, latency, conversion deltas). Its rule: Metric definitions. In the starter, the closest executable idea is **cumulative delivery**: what has been delivered so far, seen after a delay. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Opportunity is not constant: outages and surges move the target. A fixed schedule drifts by 6.76% on average and ends the day 5.1% under plan.

## 4. Baseline against the stronger design

A PID pacer with anti-windup tracks to 2.56%, a 62% reduction. Very high gains track tighter (1.09%) but make the control signal 8.1 times noisier, which costs delivery quality. A two-hour feedback delay raises tracking error to 5.50%.

| Result | Value |
|---|---|
| Tracking error, open loop | 6.76% |
| Tracking error, PID | 2.56% |
| Reduction versus open loop | 62.2% |
| Control jitter, PID versus aggressive gains | 0.011 vs 0.093 |
| Tracking error with a two-hour feedback delay | 5.50% |

## 5. An edge case from the blueprint

**Metric pipeline delay.** harm detected late. Planned response: Fast proxy metrics and delay-aware thresholds. Write the test that replays this case through your pipeline before you tune anything.

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
| `days` | 66 |
| `steps_per_day` | 288 |
| `open_loop.tracking_rmse_pct` | 6.7636 |
| `open_loop.end_of_day_underdelivery_pct` | 5.0648 |
| `open_loop.overshoot_max_pct` | 7.9383 |
| `open_loop.oscillation` | 0 |
| `open_loop.hit_cap` | 0.60606 |
| `pid.tracking_rmse_pct` | 2.5589 |
| `pid.end_of_day_underdelivery_pct` | 0.74441 |
| `pid.overshoot_max_pct` | 5.3991 |
| `pid.oscillation` | 0.01148 |
| `pid.hit_cap` | 0.45455 |
| `pid_aggressive_gains.tracking_rmse_pct` | 1.0942 |
| `pid_aggressive_gains.end_of_day_underdelivery_pct` | 0.044838 |
| `pid_aggressive_gains.overshoot_max_pct` | 2.0411 |
| `pid_aggressive_gains.oscillation` | 0.093396 |
| `pid_aggressive_gains.hit_cap` | 0.54545 |
| `pid_with_two_hour_feedback_delay.tracking_rmse_pct` | 5.5039 |
| `pid_with_two_hour_feedback_delay.end_of_day_underdelivery_pct` | 1.9435 |
| `pid_with_two_hour_feedback_delay.overshoot_max_pct` | 12.869 |
| `pid_with_two_hour_feedback_delay.oscillation` | 0.01807 |
| `pid_with_two_hour_feedback_delay.hit_cap` | 0.59091 |
| `rmse_reduction_vs_open_loop` | 0.62167 |

</details>
