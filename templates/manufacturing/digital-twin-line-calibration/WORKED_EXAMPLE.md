# Digital Twin Calibration for Line Simulation: worked example

> Run on synthetic data with `generative` engine, seed 10270, knobs {"n": 244}, in 1.6 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Calibrate a discrete-event simulation of a production line from real event data so what-if tests on layout, buffers and staffing give trustworthy answers.

**Constraints that shape the design.** The twin reproduces throughput within 3% on held-out weeks; Calibration reruns monthly; Every parameter has a source

**Label in this use case.** For "Digital Twin Calibration for Line Simulation": Calibrate a discrete-event simulation of a production line from real event data so what-if tests on layout, buffers and staffing give trustworthy answers. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Fitting to the training period only.

## 2. Choose the signals

Your strongest signal is **Process time distribution** (fitted distribution of cycle times per station). Its rule: Per product. In the starter, the closest executable idea is **key facts**: the entity, amount and date every output must contain. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

The same outputs pass 16.8% under the strict judge and 47.5% under the fuzzy one, because valid formats are rejected by exact matching. The judges agree only moderately (kappa 0.36).

## 4. Baseline against the stronger design

Version 2 passes 58.6% against 47.5%: a difference of 11.1% with a 95% interval of 4.5% to 19.7%. With only 60 items the interval on one pass rate is 0.23 wide, against 0.11 on the full set.

| Result | Value |
|---|---|
| Pass rate v1, strict judge | 16.8% |
| Pass rate v1, fuzzy judge | 47.5% |
| Pass rate v2, fuzzy judge | 58.6% |
| v2 minus v1, 95% interval | 11.1% (4.5% to 19.7%) |
| Judge agreement (kappa) | 0.36 |

## 5. An edge case from the blueprint

**Recipe change.** process times shift. Planned response: Recalibration trigger on approved changes. Write the test that replays this case through your pipeline before you tune anything.

## 6. What to expect on your own data

Agree the rubric with the people who own quality, show that two judges agree before trusting either, size the golden set from the interval you need, and replace the stand-in generator with your model.

## 7. Do this next

1. `cd starter && make setup && make demo` to reproduce the table above.
2. Replace the synthetic generator with an extract of your data and keep the split, the leakage tests and the gates.
3. Run through `docs/02-delivery-plan.md` milestone by milestone; each exit gate is a number you can check.

<details>
<summary>Every number from this run</summary>

| Metric | Value |
|---|---|
| `golden_items` | 244 |
| `v1_pass_rate_strict_judge` | 0.16803 |
| `v1_pass_rate_fuzzy_judge` | 0.47541 |
| `v2_pass_rate_fuzzy_judge` | 0.58607 |
| `v1_pass_rate_ci95` | 0.4179, 0.5287 |
| `v2_minus_v1` | 0.11066 |
| `v2_minus_v1_ci95` | 0.04508, 0.1968 |
| `judge_agreement_kappa_v1` | 0.3645 |
| `judge_disagreement_share_v1` | 0.30738 |
| `v1_failure_share_by_check.has_entity` | 0 |
| `v1_failure_share_by_check.amount_correct` | 0.47541 |
| `v1_failure_share_by_check.date_correct` | 0.16393 |
| `v1_failure_share_by_check.within_length` | 0.02459 |
| `v1_failure_share_by_check.no_forbidden_claims` | 0.069672 |
| `ci_width_at_60_items` | 0.23333 |
| `ci_width_at_full_set` | 0.11076 |

</details>
