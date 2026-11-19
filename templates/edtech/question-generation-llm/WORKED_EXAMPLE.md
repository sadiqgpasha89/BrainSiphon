# Question Generation with LLMs: worked example

> Run on synthetic data with `generative` engine, seed 4069, knobs {"n": 228}, in 0.6 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Generate curriculum-aligned questions with correct answers, plausible distractors and difficulty tags for teacher review.

**Constraints that shape the design.** Factual correctness; Alignment to learning objectives; Bias and sensitivity

**Label in this use case.** For "Question Generation with LLMs": Generate curriculum-aligned questions with correct answers, plausible distractors and difficulty tags for teacher review. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating without a solver check.

## 2. Choose the signals

Your strongest signal is **Independent solve agreement** (solver matches key). Its rule: Solver quality. In the starter, the closest executable idea is **key facts**: the entity, amount and date every output must contain. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

The same outputs pass 18.4% under the strict judge and 48.7% under the fuzzy one, because valid formats are rejected by exact matching. The judges agree only moderately (kappa 0.38).

## 4. Baseline against the stronger design

Version 2 passes 53.5% against 48.7%: a difference of 4.8% with a 95% interval of -5.3% to 14.5%. With only 60 items the interval on one pass rate is 0.25 wide, against 0.14 on the full set.

| Result | Value |
|---|---|
| Pass rate v1, strict judge | 18.4% |
| Pass rate v1, fuzzy judge | 48.7% |
| Pass rate v2, fuzzy judge | 53.5% |
| v2 minus v1, 95% interval | 4.8% (-5.3% to 14.5%) |
| Judge agreement (kappa) | 0.38 |

## 5. An edge case from the blueprint

**Wrong answer key accepted.** students are taught or graded incorrectly. Planned response: Verification by independent solvers and teacher spot-checks. Write the test that replays this case through your pipeline before you tune anything.

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
| `golden_items` | 228 |
| `v1_pass_rate_strict_judge` | 0.18421 |
| `v1_pass_rate_fuzzy_judge` | 0.48684 |
| `v2_pass_rate_fuzzy_judge` | 0.53509 |
| `v1_pass_rate_ci95` | 0.4253, 0.5614 |
| `v2_minus_v1` | 0.048246 |
| `v2_minus_v1_ci95` | -0.05263, 0.1447 |
| `judge_agreement_kappa_v1` | 0.38451 |
| `judge_disagreement_share_v1` | 0.30263 |
| `v1_failure_share_by_check.has_entity` | 0 |
| `v1_failure_share_by_check.amount_correct` | 0.48684 |
| `v1_failure_share_by_check.date_correct` | 0.11404 |
| `v1_failure_share_by_check.within_length` | 0.013158 |
| `v1_failure_share_by_check.no_forbidden_claims` | 0.048246 |
| `ci_width_at_60_items` | 0.25 |
| `ci_width_at_full_set` | 0.13607 |

</details>
