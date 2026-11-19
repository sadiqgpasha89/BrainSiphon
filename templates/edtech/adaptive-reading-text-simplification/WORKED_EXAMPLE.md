# Adaptive Reading & Text Simplification: worked example

> Run on synthetic data with `generative` engine, seed 87039, knobs {"n": 216}, in 0.6 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Adapt reading passages to each learner's reading level while preserving meaning, with vocabulary supports and comprehension checks.

**Constraints that shape the design.** Meaning preservation; Grade-level control; Copyright

**Label in this use case.** For "Adaptive Reading & Text Simplification": Adapt reading passages to each learner's reading level while preserving meaning, with vocabulary supports and comprehension checks. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating fluency not fidelity.

## 2. Choose the signals

Your strongest signal is **Reading-level estimate** (model-based readability). Its rule: Calibration. In the starter, the closest executable idea is **key facts**: the entity, amount and date every output must contain. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

The same outputs pass 15.3% under the strict judge and 44.4% under the fuzzy one, because valid formats are rejected by exact matching. The judges agree only moderately (kappa 0.37).

## 4. Baseline against the stronger design

Version 2 passes 57.4% against 44.4%: a difference of 13.0% with a 95% interval of 2.8% to 21.8%. With only 60 items the interval on one pass rate is 0.25 wide, against 0.13 on the full set.

| Result | Value |
|---|---|
| Pass rate v1, strict judge | 15.3% |
| Pass rate v1, fuzzy judge | 44.4% |
| Pass rate v2, fuzzy judge | 57.4% |
| v2 minus v1, 95% interval | 13.0% (2.8% to 21.8%) |
| Judge agreement (kappa) | 0.37 |

## 5. An edge case from the blueprint

**Simplification removes critical nuance.** misleads learners. Planned response: Fact-retention verifier and teacher review for key texts. Write the test that replays this case through your pipeline before you tune anything.

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
| `golden_items` | 216 |
| `v1_pass_rate_strict_judge` | 0.15278 |
| `v1_pass_rate_fuzzy_judge` | 0.44444 |
| `v2_pass_rate_fuzzy_judge` | 0.57407 |
| `v1_pass_rate_ci95` | 0.3796, 0.5139 |
| `v2_minus_v1` | 0.12963 |
| `v2_minus_v1_ci95` | 0.02778, 0.2177 |
| `judge_agreement_kappa_v1` | 0.36789 |
| `judge_disagreement_share_v1` | 0.29167 |
| `v1_failure_share_by_check.has_entity` | 0 |
| `v1_failure_share_by_check.amount_correct` | 0.50463 |
| `v1_failure_share_by_check.date_correct` | 0.17593 |
| `v1_failure_share_by_check.within_length` | 0.032407 |
| `v1_failure_share_by_check.no_forbidden_claims` | 0.069444 |
| `ci_width_at_60_items` | 0.25 |
| `ci_width_at_full_set` | 0.13426 |

</details>
