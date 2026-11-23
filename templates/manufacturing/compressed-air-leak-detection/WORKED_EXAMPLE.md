# Compressed Air Leak Detection: worked example

> Run on synthetic data with `generative` engine, seed 72664, knobs {"n": 239}, in 1.8 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect compressed air leaks from flow, pressure and compressor data and prioritise repairs by energy cost so waste falls.

**Constraints that shape the design.** Leak estimate in cubic metres per hour with a range; Production-off baselines; Priority by cost

**Label in this use case.** For "Compressed Air Leak Detection": Detect compressed air leaks from flow, pressure and compressor data and prioritise repairs by energy cost so waste falls. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Total flow monitoring only.

## 2. Choose the signals

Your strongest signal is **Idle-period flow** (flow during shutdown windows). Its rule: From the production calendar. In the starter, the closest executable idea is **key facts**: the entity, amount and date every output must contain. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

The same outputs pass 13.4% under the strict judge and 50.6% under the fuzzy one, because valid formats are rejected by exact matching. The judges agree only moderately (kappa 0.26).

## 4. Baseline against the stronger design

Version 2 passes 63.2% against 50.6%: a difference of 12.6% with a 95% interval of 3.3% to 20.9%. With only 60 items the interval on one pass rate is 0.25 wide, against 0.13 on the full set.

| Result | Value |
|---|---|
| Pass rate v1, strict judge | 13.4% |
| Pass rate v1, fuzzy judge | 50.6% |
| Pass rate v2, fuzzy judge | 63.2% |
| v2 minus v1, 95% interval | 12.6% (3.3% to 20.9%) |
| Judge agreement (kappa) | 0.26 |

## 5. An edge case from the blueprint

**No idle window.** the plant never stops. Planned response: Use low-load windows and zone isolation. Write the test that replays this case through your pipeline before you tune anything.

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
| `golden_items` | 239 |
| `v1_pass_rate_strict_judge` | 0.13389 |
| `v1_pass_rate_fuzzy_judge` | 0.50628 |
| `v2_pass_rate_fuzzy_judge` | 0.6318 |
| `v1_pass_rate_ci95` | 0.4435, 0.5732 |
| `v2_minus_v1` | 0.12552 |
| `v2_minus_v1_ci95` | 0.03347, 0.2092 |
| `judge_agreement_kappa_v1` | 0.26201 |
| `judge_disagreement_share_v1` | 0.37238 |
| `v1_failure_share_by_check.has_entity` | 0 |
| `v1_failure_share_by_check.amount_correct` | 0.45188 |
| `v1_failure_share_by_check.date_correct` | 0.13389 |
| `v1_failure_share_by_check.within_length` | 0.0083682 |
| `v1_failure_share_by_check.no_forbidden_claims` | 0.066946 |
| `ci_width_at_60_items` | 0.25 |
| `ci_width_at_full_set` | 0.12971 |

</details>
