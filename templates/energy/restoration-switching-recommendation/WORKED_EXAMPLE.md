# Restoration Switching Recommendation: worked example

> Run on synthetic data with `control` engine, seed 45362, knobs {"days": 75}, in 2.8 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Propose switching sequences that restore as many customers as quickly as possible after a fault within loading and protection limits, for the operator to review and execute.

**Constraints that shape the design.** Every proposed sequence passes a power flow and protection check; The operator reviews and executes; Proposal within 20 s

**Label in this use case.** For "Restoration Switching Recommendation": Propose switching sequences that restore as many customers as quickly as possible after a fault within loading and protection limits, for the operator to review and execute. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Learned safety checks.

## 2. Choose the signals

Your strongest signal is **Faulted section and isolation points** (location of the fault and the nearest switches). Its rule: From fault location. In the starter, the closest executable idea is **cumulative delivery**: what has been delivered so far, seen after a delay. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Opportunity is not constant: outages and surges move the target. A fixed schedule drifts by 7.11% on average and ends the day 4.1% under plan.

## 4. Baseline against the stronger design

A PID pacer with anti-windup tracks to 2.57%, a 64% reduction. Very high gains track tighter (1.15%) but make the control signal 8.3 times noisier, which costs delivery quality. A two-hour feedback delay raises tracking error to 5.74%.

| Result | Value |
|---|---|
| Tracking error, open loop | 7.11% |
| Tracking error, PID | 2.57% |
| Reduction versus open loop | 63.8% |
| Control jitter, PID versus aggressive gains | 0.011 vs 0.091 |
| Tracking error with a two-hour feedback delay | 5.74% |

## 5. An edge case from the blueprint

**Stale switch state.** the network model is not current. Planned response: State freshness checks and a block on old data. Write the test that replays this case through your pipeline before you tune anything.

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
| `days` | 75 |
| `steps_per_day` | 288 |
| `open_loop.tracking_rmse_pct` | 7.1121 |
| `open_loop.end_of_day_underdelivery_pct` | 4.0569 |
| `open_loop.overshoot_max_pct` | 8.5115 |
| `open_loop.oscillation` | 0 |
| `open_loop.hit_cap` | 0.62667 |
| `pid.tracking_rmse_pct` | 2.572 |
| `pid.end_of_day_underdelivery_pct` | 1.0561 |
| `pid.overshoot_max_pct` | 5.0928 |
| `pid.oscillation` | 0.010988 |
| `pid.hit_cap` | 0.32 |
| `pid_aggressive_gains.tracking_rmse_pct` | 1.1489 |
| `pid_aggressive_gains.end_of_day_underdelivery_pct` | 0.04736 |
| `pid_aggressive_gains.overshoot_max_pct` | 1.762 |
| `pid_aggressive_gains.oscillation` | 0.090701 |
| `pid_aggressive_gains.hit_cap` | 0.48 |
| `pid_with_two_hour_feedback_delay.tracking_rmse_pct` | 5.737 |
| `pid_with_two_hour_feedback_delay.end_of_day_underdelivery_pct` | 1.8915 |
| `pid_with_two_hour_feedback_delay.overshoot_max_pct` | 14.515 |
| `pid_with_two_hour_feedback_delay.oscillation` | 0.019547 |
| `pid_with_two_hour_feedback_delay.hit_cap` | 0.54667 |
| `rmse_reduction_vs_open_loop` | 0.63836 |

</details>
