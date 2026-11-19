# Conversational Language Practice Agent: worked example

> Run on synthetic data with `generative` engine, seed 27679, knobs {"n": 291}, in 0.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Provide a patient conversation partner that adapts to the learner's level, corrects errors gently and tracks vocabulary growth.

**Constraints that shape the design.** CEFR-level control; Correction without discouraging; Cultural sensitivity

**Label in this use case.** For "Conversational Language Practice Agent": Provide a patient conversation partner that adapts to the learner's level, corrects errors gently and tracks vocabulary growth. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Judging by fluency of the bot.

## 2. Choose the signals

Your strongest signal is **Learner CEFR estimate** (model estimate from output). Its rule: Calibration. In the starter, the closest executable idea is **key facts**: the entity, amount and date every output must contain. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

The same outputs pass 17.5% under the strict judge and 50.9% under the fuzzy one, because valid formats are rejected by exact matching. The judges agree only moderately (kappa 0.34).

## 4. Baseline against the stronger design

Version 2 passes 60.8% against 50.9%: a difference of 10.0% with a 95% interval of 1.7% to 17.9%. With only 60 items the interval on one pass rate is 0.22 wide, against 0.11 on the full set.

| Result | Value |
|---|---|
| Pass rate v1, strict judge | 17.5% |
| Pass rate v1, fuzzy judge | 50.9% |
| Pass rate v2, fuzzy judge | 60.8% |
| v2 minus v1, 95% interval | 10.0% (1.7% to 17.9%) |
| Judge agreement (kappa) | 0.34 |

## 5. An edge case from the blueprint

**Learner asks off-topic or unsafe questions.** agent leaves scope. Planned response: Scope guardrails and redirect. Write the test that replays this case through your pipeline before you tune anything.

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
| `golden_items` | 291 |
| `v1_pass_rate_strict_judge` | 0.17526 |
| `v1_pass_rate_fuzzy_judge` | 0.50859 |
| `v2_pass_rate_fuzzy_judge` | 0.60825 |
| `v1_pass_rate_ci95` | 0.4536, 0.5601 |
| `v2_minus_v1` | 0.099656 |
| `v2_minus_v1_ci95` | 0.01718, 0.1788 |
| `judge_agreement_kappa_v1` | 0.34069 |
| `judge_disagreement_share_v1` | 0.33333 |
| `v1_failure_share_by_check.has_entity` | 0 |
| `v1_failure_share_by_check.amount_correct` | 0.44674 |
| `v1_failure_share_by_check.date_correct` | 0.14777 |
| `v1_failure_share_by_check.within_length` | 0.024055 |
| `v1_failure_share_by_check.no_forbidden_claims` | 0.058419 |
| `ci_width_at_60_items` | 0.21667 |
| `ci_width_at_full_set` | 0.10653 |

</details>
