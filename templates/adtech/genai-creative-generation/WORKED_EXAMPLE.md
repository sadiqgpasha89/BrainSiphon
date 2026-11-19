# GenAI Ad Creative Generation: worked example

> Run on synthetic data with `generative` engine, seed 64501, knobs {"n": 266}, in 0.9 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Generate on-brand headlines, copy and image variants at scale and filter them by predicted performance and policy.

**Constraints that shape the design.** Brand voice consistency; Ad policy compliance; IP safety

**Label in this use case.** For "GenAI Ad Creative Generation": Generate on-brand headlines, copy and image variants at scale and filter them by predicted performance and policy. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Predicted CTR trained on human-made creatives.

## 2. Choose the signals

Your strongest signal is **Predicted CTR of creative** (performance model score). Its rule: Calibration. In the starter, the closest executable idea is **key facts**: the entity, amount and date every output must contain. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

The same outputs pass 10.9% under the strict judge and 50.0% under the fuzzy one, because valid formats are rejected by exact matching. The judges agree only moderately (kappa 0.22).

## 4. Baseline against the stronger design

Version 2 passes 56.4% against 50.0%: a difference of 6.4% with a 95% interval of -2.3% to 16.2%. With only 60 items the interval on one pass rate is 0.23 wide, against 0.11 on the full set.

| Result | Value |
|---|---|
| Pass rate v1, strict judge | 10.9% |
| Pass rate v1, fuzzy judge | 50.0% |
| Pass rate v2, fuzzy judge | 56.4% |
| v2 minus v1, 95% interval | 6.4% (-2.3% to 16.2%) |
| Judge agreement (kappa) | 0.22 |

## 5. An edge case from the blueprint

**Generated claims are legally unsupported.** regulatory violations. Planned response: Claim verification against approved claims library. Write the test that replays this case through your pipeline before you tune anything.

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
| `golden_items` | 266 |
| `v1_pass_rate_strict_judge` | 0.10902 |
| `v1_pass_rate_fuzzy_judge` | 0.5 |
| `v2_pass_rate_fuzzy_judge` | 0.56391 |
| `v1_pass_rate_ci95` | 0.4435, 0.5565 |
| `v2_minus_v1` | 0.06391 |
| `v2_minus_v1_ci95` | -0.02256, 0.1617 |
| `judge_agreement_kappa_v1` | 0.21805 |
| `judge_disagreement_share_v1` | 0.39098 |
| `v1_failure_share_by_check.has_entity` | 0 |
| `v1_failure_share_by_check.amount_correct` | 0.47744 |
| `v1_failure_share_by_check.date_correct` | 0.11654 |
| `v1_failure_share_by_check.within_length` | 0.026316 |
| `v1_failure_share_by_check.no_forbidden_claims` | 0.056391 |
| `ci_width_at_60_items` | 0.23333 |
| `ci_width_at_full_set` | 0.11297 |

</details>
