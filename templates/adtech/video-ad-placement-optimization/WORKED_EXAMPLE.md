# Video Ad Placement & Pod Optimisation: worked example

> Run on synthetic data with `control` engine, seed 11542, knobs {"days": 77}, in 0.9 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Choose ad slots, pod length and creatives in streaming video to maximise revenue and completion while limiting viewer abandonment.

**Constraints that shape the design.** Latency before playback; Ad-load policies; Content-sensitive breaks

**Label in this use case.** For "Video Ad Placement & Pod Optimisation": Choose ad slots, pod length and creatives in streaming video to maximise revenue and completion while limiting viewer abandonment. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Observational ad loads confounded with content.

## 2. Choose the signals

Your strongest signal is **Viewer abandonment hazard** (probability to drop at ad break). Its rule: History. In the starter, the closest executable idea is **cumulative delivery**: what has been delivered so far, seen after a delay. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Opportunity is not constant: outages and surges move the target. A fixed schedule drifts by 7.14% on average and ends the day 5.8% under plan.

## 4. Baseline against the stronger design

A PID pacer with anti-windup tracks to 2.76%, a 61% reduction. Very high gains track tighter (1.18%) but make the control signal 7.4 times noisier, which costs delivery quality. A two-hour feedback delay raises tracking error to 5.39%.

| Result | Value |
|---|---|
| Tracking error, open loop | 7.14% |
| Tracking error, PID | 2.76% |
| Reduction versus open loop | 61.4% |
| Control jitter, PID versus aggressive gains | 0.012 vs 0.085 |
| Tracking error with a two-hour feedback delay | 5.39% |

## 5. An edge case from the blueprint

**Live sports where breaks are unpredictable.** placement misaligned. Planned response: Operator cue integration and short-window decisions. Write the test that replays this case through your pipeline before you tune anything.

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
| `days` | 77 |
| `steps_per_day` | 288 |
| `open_loop.tracking_rmse_pct` | 7.1359 |
| `open_loop.end_of_day_underdelivery_pct` | 5.7727 |
| `open_loop.overshoot_max_pct` | 6.8724 |
| `open_loop.oscillation` | 0 |
| `open_loop.hit_cap` | 0.51948 |
| `pid.tracking_rmse_pct` | 2.7568 |
| `pid.end_of_day_underdelivery_pct` | 0.95824 |
| `pid.overshoot_max_pct` | 5.4994 |
| `pid.oscillation` | 0.011501 |
| `pid.hit_cap` | 0.4026 |
| `pid_aggressive_gains.tracking_rmse_pct` | 1.1846 |
| `pid_aggressive_gains.end_of_day_underdelivery_pct` | 0.050899 |
| `pid_aggressive_gains.overshoot_max_pct` | 1.8071 |
| `pid_aggressive_gains.oscillation` | 0.084548 |
| `pid_aggressive_gains.hit_cap` | 0.44156 |
| `pid_with_two_hour_feedback_delay.tracking_rmse_pct` | 5.3863 |
| `pid_with_two_hour_feedback_delay.end_of_day_underdelivery_pct` | 1.849 |
| `pid_with_two_hour_feedback_delay.overshoot_max_pct` | 12.893 |
| `pid_with_two_hour_feedback_delay.oscillation` | 0.017812 |
| `pid_with_two_hour_feedback_delay.hit_cap` | 0.54545 |
| `rmse_reduction_vs_open_loop` | 0.61368 |

</details>
