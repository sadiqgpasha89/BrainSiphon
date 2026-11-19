# Gift Recommendation Assistant: worked example

> Run on synthetic data with `generative` engine, seed 59947, knobs {"n": 248}, in 0.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Help users find gifts for recipients and occasions through a short conversation with grounded product suggestions.

**Constraints that shape the design.** Budget and delivery date constraints; Age-appropriate content; No fabricated items

**Label in this use case.** For "Gift Recommendation Assistant": Help users find gifts for recipients and occasions through a short conversation with grounded product suggestions. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating on easy briefs.

## 2. Choose the signals

Your strongest signal is **Gift-brief completeness** (filled slots out of required). Its rule: Slot extractor accuracy. In the starter, the closest executable idea is **key facts**: the entity, amount and date every output must contain. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

The same outputs pass 18.1% under the strict judge and 49.2% under the fuzzy one, because valid formats are rejected by exact matching. The judges agree only moderately (kappa 0.37).

## 4. Baseline against the stronger design

Version 2 passes 59.3% against 49.2%: a difference of 10.1% with a 95% interval of 1.6% to 19.0%. With only 60 items the interval on one pass rate is 0.25 wide, against 0.13 on the full set.

| Result | Value |
|---|---|
| Pass rate v1, strict judge | 18.1% |
| Pass rate v1, fuzzy judge | 49.2% |
| Pass rate v2, fuzzy judge | 59.3% |
| v2 minus v1, 95% interval | 10.1% (1.6% to 19.0%) |
| Judge agreement (kappa) | 0.37 |

## 5. An edge case from the blueprint

**Seasonal peak (festival).** traffic rises ten-fold and LLM cost and latency blow past budget. Planned response: Pre-computed gift sets and cache for common briefs. Write the test that replays this case through your pipeline before you tune anything.

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
| `golden_items` | 248 |
| `v1_pass_rate_strict_judge` | 0.18145 |
| `v1_pass_rate_fuzzy_judge` | 0.49194 |
| `v2_pass_rate_fuzzy_judge` | 0.59274 |
| `v1_pass_rate_ci95` | 0.4193, 0.5524 |
| `v2_minus_v1` | 0.10081 |
| `v2_minus_v1_ci95` | 0.01613, 0.1896 |
| `judge_agreement_kappa_v1` | 0.37259 |
| `judge_disagreement_share_v1` | 0.31048 |
| `v1_failure_share_by_check.has_entity` | 0 |
| `v1_failure_share_by_check.amount_correct` | 0.46774 |
| `v1_failure_share_by_check.date_correct` | 0.14516 |
| `v1_failure_share_by_check.within_length` | 0.032258 |
| `v1_failure_share_by_check.no_forbidden_claims` | 0.060484 |
| `ci_width_at_60_items` | 0.25 |
| `ci_width_at_full_set` | 0.13317 |

</details>
