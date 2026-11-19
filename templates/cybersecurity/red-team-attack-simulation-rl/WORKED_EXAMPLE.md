# Automated Red-Team Attack Simulation: worked example

> Run on synthetic data with `control` engine, seed 39394, knobs {"days": 78}, in 1.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Use RL agents in a safe emulation environment to discover attack paths and test detection coverage continuously.

**Constraints that shape the design.** Safe, isolated or production-safe techniques; Detection feedback loop; Reproducibility

**Label in this use case.** For "Automated Red-Team Attack Simulation": Use RL agents in a safe emulation environment to discover attack paths and test detection coverage continuously. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Rewarding unrealistic exploits.

## 2. Choose the signals

Your strongest signal is **Technique success probability** (success per technique and control). Its rule: Environment. In the starter, the closest executable idea is **cumulative delivery**: what has been delivered so far, seen after a delay. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Opportunity is not constant: outages and surges move the target. A fixed schedule drifts by 5.91% on average and ends the day 4.1% under plan.

## 4. Baseline against the stronger design

A PID pacer with anti-windup tracks to 2.42%, a 59% reduction. Very high gains track tighter (0.97%) but make the control signal 7.9 times noisier, which costs delivery quality. A two-hour feedback delay raises tracking error to 5.39%.

| Result | Value |
|---|---|
| Tracking error, open loop | 5.91% |
| Tracking error, PID | 2.42% |
| Reduction versus open loop | 59.1% |
| Control jitter, PID versus aggressive gains | 0.011 vs 0.089 |
| Tracking error with a two-hour feedback delay | 5.39% |

## 5. An edge case from the blueprint

**Emulated action causes real outage.** production impact. Planned response: Isolated range for risky steps and approval for production-safe steps. Write the test that replays this case through your pipeline before you tune anything.

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
| `days` | 78 |
| `steps_per_day` | 288 |
| `open_loop.tracking_rmse_pct` | 5.9108 |
| `open_loop.end_of_day_underdelivery_pct` | 4.1049 |
| `open_loop.overshoot_max_pct` | 7.2822 |
| `open_loop.oscillation` | 0 |
| `open_loop.hit_cap` | 0.60256 |
| `pid.tracking_rmse_pct` | 2.4166 |
| `pid.end_of_day_underdelivery_pct` | 0.84394 |
| `pid.overshoot_max_pct` | 5.5327 |
| `pid.oscillation` | 0.01137 |
| `pid.hit_cap` | 0.41026 |
| `pid_aggressive_gains.tracking_rmse_pct` | 0.97147 |
| `pid_aggressive_gains.end_of_day_underdelivery_pct` | 0.046793 |
| `pid_aggressive_gains.overshoot_max_pct` | 2.073 |
| `pid_aggressive_gains.oscillation` | 0.089284 |
| `pid_aggressive_gains.hit_cap` | 0.47436 |
| `pid_with_two_hour_feedback_delay.tracking_rmse_pct` | 5.3895 |
| `pid_with_two_hour_feedback_delay.end_of_day_underdelivery_pct` | 2.0204 |
| `pid_with_two_hour_feedback_delay.overshoot_max_pct` | 13.02 |
| `pid_with_two_hour_feedback_delay.oscillation` | 0.018445 |
| `pid_with_two_hour_feedback_delay.hit_cap` | 0.57692 |
| `rmse_reduction_vs_open_loop` | 0.59115 |

</details>
