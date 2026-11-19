# ML-Guided Fuzzing: worked example

> Run on synthetic data with `control` engine, seed 8407, knobs {"days": 67}, in 1.1 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Increase crash discovery per CPU hour by learning which inputs and mutations are most likely to reach new code.

**Constraints that shape the design.** Millions of executions per hour; Deterministic reproduction; Triage deduplication

**Label in this use case.** For "ML-Guided Fuzzing": Increase crash discovery per CPU hour by learning which inputs and mutations are most likely to reach new code. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Counting duplicate crashes as separate bugs.

## 2. Choose the signals

Your strongest signal is **Coverage novelty reward** (new edges per execution). Its rule: Instrumentation. In the starter, the closest executable idea is **cumulative delivery**: what has been delivered so far, seen after a delay. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Opportunity is not constant: outages and surges move the target. A fixed schedule drifts by 6.24% on average and ends the day 3.7% under plan.

## 4. Baseline against the stronger design

A PID pacer with anti-windup tracks to 2.89%, a 54% reduction. Very high gains track tighter (1.18%) but make the control signal 6.9 times noisier, which costs delivery quality. A two-hour feedback delay raises tracking error to 5.81%.

| Result | Value |
|---|---|
| Tracking error, open loop | 6.24% |
| Tracking error, PID | 2.89% |
| Reduction versus open loop | 53.7% |
| Control jitter, PID versus aggressive gains | 0.013 vs 0.089 |
| Tracking error with a two-hour feedback delay | 5.81% |

## 5. An edge case from the blueprint

**Fuzz harness is shallow.** coverage plateaus early. Planned response: Harness quality metrics and deeper entry points. Write the test that replays this case through your pipeline before you tune anything.

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
| `open_loop.tracking_rmse_pct` | 6.2448 |
| `open_loop.end_of_day_underdelivery_pct` | 3.7297 |
| `open_loop.overshoot_max_pct` | 8.1522 |
| `open_loop.oscillation` | 0 |
| `open_loop.hit_cap` | 0.56716 |
| `pid.tracking_rmse_pct` | 2.8941 |
| `pid.end_of_day_underdelivery_pct` | 1.0905 |
| `pid.overshoot_max_pct` | 6.3747 |
| `pid.oscillation` | 0.012942 |
| `pid.hit_cap` | 0.34328 |
| `pid_aggressive_gains.tracking_rmse_pct` | 1.1816 |
| `pid_aggressive_gains.end_of_day_underdelivery_pct` | 0.044681 |
| `pid_aggressive_gains.overshoot_max_pct` | 1.9595 |
| `pid_aggressive_gains.oscillation` | 0.089177 |
| `pid_aggressive_gains.hit_cap` | 0.44776 |
| `pid_with_two_hour_feedback_delay.tracking_rmse_pct` | 5.8082 |
| `pid_with_two_hour_feedback_delay.end_of_day_underdelivery_pct` | 2.0976 |
| `pid_with_two_hour_feedback_delay.overshoot_max_pct` | 14.596 |
| `pid_with_two_hour_feedback_delay.oscillation` | 0.019872 |
| `pid_with_two_hour_feedback_delay.hit_cap` | 0.64179 |
| `rmse_reduction_vs_open_loop` | 0.53656 |

</details>
