# Connected Product Service Scheduling: worked example

> Run on synthetic data with `generative` engine, seed 41302, knobs {"n": 252}, in 1.8 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Schedule service visits and parts for connected industrial products from usage and condition data so customers have fewer breakdowns and fewer unnecessary visits.

**Constraints that shape the design.** Customer contract and consent respected; Visits proposed with parts and skills; Customers can decline

**Label in this use case.** For "Connected Product Service Scheduling": Schedule service visits and parts for connected industrial products from usage and condition data so customers have fewer breakdowns and fewer unnecessary visits. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Fixed intervals only.

## 2. Choose the signals

Your strongest signal is **Usage hours and load** (running hours and load profile). Its rule: From telemetry. In the starter, the closest executable idea is **key facts**: the entity, amount and date every output must contain. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

The same outputs pass 13.1% under the strict judge and 48.0% under the fuzzy one, because valid formats are rejected by exact matching. The judges agree only moderately (kappa 0.28).

## 4. Baseline against the stronger design

Version 2 passes 61.1% against 48.0%: a difference of 13.1% with a 95% interval of 5.1% to 21.8%. With only 60 items the interval on one pass rate is 0.25 wide, against 0.14 on the full set.

| Result | Value |
|---|---|
| Pass rate v1, strict judge | 13.1% |
| Pass rate v1, fuzzy judge | 48.0% |
| Pass rate v2, fuzzy judge | 61.1% |
| v2 minus v1, 95% interval | 13.1% (5.1% to 21.8%) |
| Judge agreement (kappa) | 0.28 |

## 5. An edge case from the blueprint

**Connectivity gaps.** no data for a period. Planned response: Use last known state and widen intervals. Write the test that replays this case through your pipeline before you tune anything.

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
| `golden_items` | 252 |
| `v1_pass_rate_strict_judge` | 0.13095 |
| `v1_pass_rate_fuzzy_judge` | 0.48016 |
| `v2_pass_rate_fuzzy_judge` | 0.61111 |
| `v1_pass_rate_ci95` | 0.4087, 0.5476 |
| `v2_minus_v1` | 0.13095 |
| `v2_minus_v1_ci95` | 0.05149, 0.2184 |
| `judge_agreement_kappa_v1` | 0.28051 |
| `judge_disagreement_share_v1` | 0.34921 |
| `v1_failure_share_by_check.has_entity` | 0 |
| `v1_failure_share_by_check.amount_correct` | 0.49206 |
| `v1_failure_share_by_check.date_correct` | 0.13095 |
| `v1_failure_share_by_check.within_length` | 0.0079365 |
| `v1_failure_share_by_check.no_forbidden_claims` | 0.047619 |
| `ci_width_at_60_items` | 0.25042 |
| `ci_width_at_full_set` | 0.13889 |

</details>
