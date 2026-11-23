# Delay Claims Analysis: worked example

> Run on synthetic data with `generative` engine, seed 46269, knobs {"n": 317}, in 1.9 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Reconstruct schedule history and records to show causes of delay and the share each event contributed, giving claims teams evidence packs for experts and counsel to review.

**Constraints that shape the design.** Every finding cites schedule updates and records; Methods named and repeatable; Delay experts and counsel decide positions

**Label in this use case.** For "Delay Claims Analysis": Reconstruct schedule history and records to show causes of delay and the share each event contributed, giving claims teams evidence packs for experts and counsel to review. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Custom scores.

## 2. Choose the signals

Your strongest signal is **Schedule update history** (planned versus actual by update). Its rule: From schedule archives. In the starter, the closest executable idea is **key facts**: the entity, amount and date every output must contain. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

The same outputs pass 14.2% under the strict judge and 51.1% under the fuzzy one, because valid formats are rejected by exact matching. The judges agree only moderately (kappa 0.27).

## 4. Baseline against the stronger design

Version 2 passes 58.4% against 51.1%: a difference of 7.3% with a 95% interval of -0.6% to 15.1%. With only 60 items the interval on one pass rate is 0.25 wide, against 0.11 on the full set.

| Result | Value |
|---|---|
| Pass rate v1, strict judge | 14.2% |
| Pass rate v1, fuzzy judge | 51.1% |
| Pass rate v2, fuzzy judge | 58.4% |
| v2 minus v1, 95% interval | 7.3% (-0.6% to 15.1%) |
| Judge agreement (kappa) | 0.27 |

## 5. An edge case from the blueprint

**Missing updates.** schedule updates are not archived. Planned response: State gaps and limits. Write the test that replays this case through your pipeline before you tune anything.

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
| `golden_items` | 317 |
| `v1_pass_rate_strict_judge` | 0.14196 |
| `v1_pass_rate_fuzzy_judge` | 0.51104 |
| `v2_pass_rate_fuzzy_judge` | 0.5836 |
| `v1_pass_rate_ci95` | 0.4542, 0.5679 |
| `v2_minus_v1` | 0.072555 |
| `v2_minus_v1_ci95` | -0.006388, 0.1514 |
| `judge_agreement_kappa_v1` | 0.27332 |
| `judge_disagreement_share_v1` | 0.36909 |
| `v1_failure_share_by_check.has_entity` | 0 |
| `v1_failure_share_by_check.amount_correct` | 0.44795 |
| `v1_failure_share_by_check.date_correct` | 0.1041 |
| `v1_failure_share_by_check.within_length` | 0.025237 |
| `v1_failure_share_by_check.no_forbidden_claims` | 0.066246 |
| `ci_width_at_60_items` | 0.25 |
| `ci_width_at_full_set` | 0.11372 |

</details>
