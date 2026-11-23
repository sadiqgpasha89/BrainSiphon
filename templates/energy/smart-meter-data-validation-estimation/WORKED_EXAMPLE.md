# Smart Meter Data Validation and Estimation: worked example

> Run on synthetic data with `generative` engine, seed 41109, knobs {"n": 206}, in 1.8 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Validate interval meter reads, detect gaps and spikes, and estimate missing values with flags so billing and analytics use trustworthy data.

**Constraints that shape the design.** Every estimate is flagged and traceable; Estimates follow the regulatory rules; Validation within one day of read

**Label in this use case.** For "Smart Meter Data Validation and Estimation": Validate interval meter reads, detect gaps and spikes, and estimate missing values with flags so billing and analytics use trustworthy data. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Overwriting raw reads.

## 2. Choose the signals

Your strongest signal is **Gap length and pattern** (missing intervals and their length). Its rule: From the reads. In the starter, the closest executable idea is **key facts**: the entity, amount and date every output must contain. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

The same outputs pass 18.4% under the strict judge and 49.5% under the fuzzy one, because valid formats are rejected by exact matching. The judges agree only moderately (kappa 0.37).

## 4. Baseline against the stronger design

Version 2 passes 61.2% against 49.5%: a difference of 11.7% with a 95% interval of 2.4% to 20.9%. With only 60 items the interval on one pass rate is 0.23 wide, against 0.14 on the full set.

| Result | Value |
|---|---|
| Pass rate v1, strict judge | 18.4% |
| Pass rate v1, fuzzy judge | 49.5% |
| Pass rate v2, fuzzy judge | 61.2% |
| v2 minus v1, 95% interval | 11.7% (2.4% to 20.9%) |
| Judge agreement (kappa) | 0.37 |

## 5. An edge case from the blueprint

**Daylight saving shift.** intervals duplicate or vanish. Planned response: Time handling tests and flags. Write the test that replays this case through your pipeline before you tune anything.

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
| `golden_items` | 206 |
| `v1_pass_rate_strict_judge` | 0.18447 |
| `v1_pass_rate_fuzzy_judge` | 0.49515 |
| `v2_pass_rate_fuzzy_judge` | 0.61165 |
| `v1_pass_rate_ci95` | 0.4271, 0.5631 |
| `v2_minus_v1` | 0.1165 |
| `v2_minus_v1_ci95` | 0.02427, 0.2089 |
| `judge_agreement_kappa_v1` | 0.37481 |
| `judge_disagreement_share_v1` | 0.31068 |
| `v1_failure_share_by_check.has_entity` | 0 |
| `v1_failure_share_by_check.amount_correct` | 0.45631 |
| `v1_failure_share_by_check.date_correct` | 0.16019 |
| `v1_failure_share_by_check.within_length` | 0.029126 |
| `v1_failure_share_by_check.no_forbidden_claims` | 0.063107 |
| `ci_width_at_60_items` | 0.23375 |
| `ci_width_at_full_set` | 0.13604 |

</details>
