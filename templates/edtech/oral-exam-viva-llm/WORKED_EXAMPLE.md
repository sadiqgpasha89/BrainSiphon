# Oral Exam & Viva Assessment with LLMs: worked example

> Run on synthetic data with `generative` engine, seed 25014, knobs {"n": 286}, in 0.8 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Conduct structured oral assessments where an AI asks follow-up questions to probe understanding, with transcripts graded by rubric and reviewed by instructors.

**Constraints that shape the design.** Fairness across accents; Consent for recording; Instructor review of scores

**Label in this use case.** For "Oral Exam & Viva Assessment with LLMs": Conduct structured oral assessments where an AI asks follow-up questions to probe understanding, with transcripts graded by rubric and reviewed by instructors. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Calibrated on a few instructors.

## 2. Choose the signals

Your strongest signal is **Rubric criterion evidence** (transcript spans per criterion). Its rule: Transcript quality. In the starter, the closest executable idea is **key facts**: the entity, amount and date every output must contain. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

The same outputs pass 17.5% under the strict judge and 48.6% under the fuzzy one, because valid formats are rejected by exact matching. The judges agree only moderately (kappa 0.37).

## 4. Baseline against the stronger design

Version 2 passes 55.6% against 48.6%: a difference of 7.0% with a 95% interval of -0.7% to 14.3%. With only 60 items the interval on one pass rate is 0.22 wide, against 0.12 on the full set.

| Result | Value |
|---|---|
| Pass rate v1, strict judge | 17.5% |
| Pass rate v1, fuzzy judge | 48.6% |
| Pass rate v2, fuzzy judge | 55.6% |
| v2 minus v1, 95% interval | 7.0% (-0.7% to 14.3%) |
| Judge agreement (kappa) | 0.37 |

## 5. An edge case from the blueprint

**ASR errors on technical terms.** student penalised for transcription errors. Planned response: Show transcript to instructors with low-confidence highlights. Write the test that replays this case through your pipeline before you tune anything.

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
| `golden_items` | 286 |
| `v1_pass_rate_strict_judge` | 0.17483 |
| `v1_pass_rate_fuzzy_judge` | 0.48601 |
| `v2_pass_rate_fuzzy_judge` | 0.55594 |
| `v1_pass_rate_ci95` | 0.4231, 0.542 |
| `v2_minus_v1` | 0.06993 |
| `v2_minus_v1_ci95` | -0.00708, 0.1434 |
| `judge_agreement_kappa_v1` | 0.36609 |
| `judge_disagreement_share_v1` | 0.31119 |
| `v1_failure_share_by_check.has_entity` | 0 |
| `v1_failure_share_by_check.amount_correct` | 0.48252 |
| `v1_failure_share_by_check.date_correct` | 0.10839 |
| `v1_failure_share_by_check.within_length` | 0.020979 |
| `v1_failure_share_by_check.no_forbidden_claims` | 0.045455 |
| `ci_width_at_60_items` | 0.21708 |
| `ci_width_at_full_set` | 0.11888 |

</details>
