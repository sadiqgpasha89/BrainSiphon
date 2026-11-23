# Digital Employee Experience Monitoring: worked example

> Run on synthetic data with `generative` engine, seed 58565, knobs {"n": 294}, in 1.8 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Measure application responsiveness, logins and meeting quality from device and network data to find group-level problems and fix them, with data aggregated to groups and never used to rank employees.

**Constraints that shape the design.** Data aggregated to groups of at least 20; No individual dashboards; Works council agreed data scope

**Label in this use case.** For "Digital Employee Experience Monitoring": Measure application responsiveness, logins and meeting quality from device and network data to find group-level problems and fix them, with data aggregated to groups and never used to rank employees. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Individual scores.

## 2. Choose the signals

Your strongest signal is **Application response times** (latency by application and site). Its rule: From agents. In the starter, the closest executable idea is **key facts**: the entity, amount and date every output must contain. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

The same outputs pass 16.0% under the strict judge and 50.0% under the fuzzy one, because valid formats are rejected by exact matching. The judges agree only moderately (kappa 0.32).

## 4. Baseline against the stronger design

Version 2 passes 55.8% against 50.0%: a difference of 5.8% with a 95% interval of -2.7% to 14.3%. With only 60 items the interval on one pass rate is 0.28 wide, against 0.11 on the full set.

| Result | Value |
|---|---|
| Pass rate v1, strict judge | 16.0% |
| Pass rate v1, fuzzy judge | 50.0% |
| Pass rate v2, fuzzy judge | 55.8% |
| v2 minus v1, 95% interval | 5.8% (-2.7% to 14.3%) |
| Judge agreement (kappa) | 0.32 |

## 5. An edge case from the blueprint

**Small group.** there are too few people. Planned response: Suppress or merge groups. Write the test that replays this case through your pipeline before you tune anything.

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
| `golden_items` | 294 |
| `v1_pass_rate_strict_judge` | 0.15986 |
| `v1_pass_rate_fuzzy_judge` | 0.5 |
| `v2_pass_rate_fuzzy_judge` | 0.55782 |
| `v1_pass_rate_ci95` | 0.4388, 0.551 |
| `v2_minus_v1` | 0.057823 |
| `v2_minus_v1_ci95` | -0.02721, 0.1429 |
| `judge_agreement_kappa_v1` | 0.31973 |
| `judge_disagreement_share_v1` | 0.34014 |
| `v1_failure_share_by_check.has_entity` | 0 |
| `v1_failure_share_by_check.amount_correct` | 0.47279 |
| `v1_failure_share_by_check.date_correct` | 0.12925 |
| `v1_failure_share_by_check.within_length` | 0.017007 |
| `v1_failure_share_by_check.no_forbidden_claims` | 0.057823 |
| `ci_width_at_60_items` | 0.28333 |
| `ci_width_at_full_set` | 0.11224 |

</details>
