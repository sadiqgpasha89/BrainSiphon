# Socratic AI Tutor: worked example

> Run on synthetic data with `generative` engine, seed 12672, knobs {"n": 215}, in 0.6 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Provide a tutor that guides learners with questions and scaffolding aligned to curriculum, rather than handing over answers.

**Constraints that shape the design.** Age-appropriate safety; Curriculum-correct content; Do not leak final answers prematurely

**Label in this use case.** For "Socratic AI Tutor": Provide a tutor that guides learners with questions and scaffolding aligned to curriculum, rather than handing over answers. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Judging tutor on helpfulness ratings.

## 2. Choose the signals

Your strongest signal is **Student mastery estimate** (KT mastery state). Its rule: Calibration. In the starter, the closest executable idea is **key facts**: the entity, amount and date every output must contain. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

The same outputs pass 17.7% under the strict judge and 52.1% under the fuzzy one, because valid formats are rejected by exact matching. The judges agree only moderately (kappa 0.33).

## 4. Baseline against the stronger design

Version 2 passes 57.2% against 52.1%: a difference of 5.1% with a 95% interval of -4.7% to 14.0%. With only 60 items the interval on one pass rate is 0.25 wide, against 0.13 on the full set.

| Result | Value |
|---|---|
| Pass rate v1, strict judge | 17.7% |
| Pass rate v1, fuzzy judge | 52.1% |
| Pass rate v2, fuzzy judge | 57.2% |
| v2 minus v1, 95% interval | 5.1% (-4.7% to 14.0%) |
| Judge agreement (kappa) | 0.33 |

## 5. An edge case from the blueprint

**Student pastes homework to get the answer.** tutor gives full solution. Planned response: Intent detection and scaffold-only policy. Write the test that replays this case through your pipeline before you tune anything.

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
| `golden_items` | 215 |
| `v1_pass_rate_strict_judge` | 0.17674 |
| `v1_pass_rate_fuzzy_judge` | 0.52093 |
| `v2_pass_rate_fuzzy_judge` | 0.57209 |
| `v1_pass_rate_ci95` | 0.4558, 0.586 |
| `v2_minus_v1` | 0.051163 |
| `v2_minus_v1_ci95` | -0.04651, 0.1397 |
| `judge_agreement_kappa_v1` | 0.32977 |
| `judge_disagreement_share_v1` | 0.34419 |
| `v1_failure_share_by_check.has_entity` | 0 |
| `v1_failure_share_by_check.amount_correct` | 0.44186 |
| `v1_failure_share_by_check.date_correct` | 0.13953 |
| `v1_failure_share_by_check.within_length` | 0.013953 |
| `v1_failure_share_by_check.no_forbidden_claims` | 0.032558 |
| `ci_width_at_60_items` | 0.25 |
| `ci_width_at_full_set` | 0.13023 |

</details>
