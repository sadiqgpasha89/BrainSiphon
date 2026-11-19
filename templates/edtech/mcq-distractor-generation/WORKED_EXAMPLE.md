# MCQ Distractor Generation: worked example

> Run on synthetic data with `generative` engine, seed 70671, knobs {"n": 311}, in 0.6 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Produce plausible but incorrect options that reflect common misconceptions to make multiple-choice items diagnostic.

**Constraints that shape the design.** Distractors must be wrong but plausible; No ambiguous correct answers; Misconception taxonomy

**Label in this use case.** For "MCQ Distractor Generation": Produce plausible but incorrect options that reflect common misconceptions to make multiple-choice items diagnostic. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating by fluency.

## 2. Choose the signals

Your strongest signal is **Misconception tag** (taxonomy mapping). Its rule: Labelling. In the starter, the closest executable idea is **key facts**: the entity, amount and date every output must contain. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

The same outputs pass 16.7% under the strict judge and 46.0% under the fuzzy one, because valid formats are rejected by exact matching. The judges agree only moderately (kappa 0.38).

## 4. Baseline against the stronger design

Version 2 passes 62.7% against 46.0%: a difference of 16.7% with a 95% interval of 9.3% to 24.1%. With only 60 items the interval on one pass rate is 0.27 wide, against 0.11 on the full set.

| Result | Value |
|---|---|
| Pass rate v1, strict judge | 16.7% |
| Pass rate v1, fuzzy judge | 46.0% |
| Pass rate v2, fuzzy judge | 62.7% |
| v2 minus v1, 95% interval | 16.7% (9.3% to 24.1%) |
| Judge agreement (kappa) | 0.38 |

## 5. An edge case from the blueprint

**Distractor is arguably correct.** students penalised unfairly. Planned response: Multi-solver ambiguity check and review. Write the test that replays this case through your pipeline before you tune anything.

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
| `golden_items` | 311 |
| `v1_pass_rate_strict_judge` | 0.1672 |
| `v1_pass_rate_fuzzy_judge` | 0.45981 |
| `v2_pass_rate_fuzzy_judge` | 0.62701 |
| `v1_pass_rate_ci95` | 0.4051, 0.5145 |
| `v2_minus_v1` | 0.1672 |
| `v2_minus_v1_ci95` | 0.09325, 0.2412 |
| `judge_agreement_kappa_v1` | 0.38171 |
| `judge_disagreement_share_v1` | 0.2926 |
| `v1_failure_share_by_check.has_entity` | 0 |
| `v1_failure_share_by_check.amount_correct` | 0.49518 |
| `v1_failure_share_by_check.date_correct` | 0.14791 |
| `v1_failure_share_by_check.within_length` | 0.012862 |
| `v1_failure_share_by_check.no_forbidden_claims` | 0.07074 |
| `ci_width_at_60_items` | 0.26667 |
| `ci_width_at_full_set` | 0.10949 |

</details>
