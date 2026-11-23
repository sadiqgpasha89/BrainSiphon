# Safety-Critical AI Validation: worked example

> Run on synthetic data with `generative` engine, seed 73890, knobs {"n": 241}, in 1.6 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Validate AI models used near safety-critical engineering decisions with independent test sets, failure analysis and operating limits so only models with documented evidence are released for use.

**Constraints that shape the design.** Independent test data never used in training; Validation report required before release; Operating limits documented and enforced

**Label in this use case.** For "Safety-Critical AI Validation": Validate AI models used near safety-critical engineering decisions with independent test sets, failure analysis and operating limits so only models with documented evidence are released for use. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training metrics as evidence.

## 2. Choose the signals

Your strongest signal is **Held-out performance by condition** (accuracy across conditions). Its rule: From validation. In the starter, the closest executable idea is **key facts**: the entity, amount and date every output must contain. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

The same outputs pass 13.3% under the strict judge and 47.3% under the fuzzy one, because valid formats are rejected by exact matching. The judges agree only moderately (kappa 0.29).

## 4. Baseline against the stronger design

Version 2 passes 58.1% against 47.3%: a difference of 10.8% with a 95% interval of 2.1% to 18.7%. With only 60 items the interval on one pass rate is 0.23 wide, against 0.13 on the full set.

| Result | Value |
|---|---|
| Pass rate v1, strict judge | 13.3% |
| Pass rate v1, fuzzy judge | 47.3% |
| Pass rate v2, fuzzy judge | 58.1% |
| v2 minus v1, 95% interval | 10.8% (2.1% to 18.7%) |
| Judge agreement (kappa) | 0.29 |

## 5. An edge case from the blueprint

**Rare conditions.** the test set lacks edge cases. Planned response: Targeted tests. Write the test that replays this case through your pipeline before you tune anything.

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
| `golden_items` | 241 |
| `v1_pass_rate_strict_judge` | 0.13278 |
| `v1_pass_rate_fuzzy_judge` | 0.47303 |
| `v2_pass_rate_fuzzy_judge` | 0.58091 |
| `v1_pass_rate_ci95` | 0.4108, 0.5436 |
| `v2_minus_v1` | 0.10788 |
| `v2_minus_v1_ci95` | 0.02064, 0.1868 |
| `judge_agreement_kappa_v1` | 0.29143 |
| `judge_disagreement_share_v1` | 0.34025 |
| `v1_failure_share_by_check.has_entity` | 0 |
| `v1_failure_share_by_check.amount_correct` | 0.48963 |
| `v1_failure_share_by_check.date_correct` | 0.16598 |
| `v1_failure_share_by_check.within_length` | 0.033195 |
| `v1_failure_share_by_check.no_forbidden_claims` | 0.041494 |
| `ci_width_at_60_items` | 0.23375 |
| `ci_width_at_full_set` | 0.13278 |

</details>
