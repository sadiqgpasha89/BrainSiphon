# Accessibility: Alt Text & Content Adaptation: worked example

> Run on synthetic data with `generative` engine, seed 48193, knobs {"n": 217}, in 0.6 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Generate high-quality alt text for educational images, diagrams and equations and adapt content for learners with disabilities.

**Constraints that shape the design.** WCAG compliance; Accurate STEM diagram descriptions; Human review for exams

**Label in this use case.** For "Accessibility: Alt Text & Content Adaptation": Generate high-quality alt text for educational images, diagrams and equations and adapt content for learners with disabilities. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluated on photos not diagrams.

## 2. Choose the signals

Your strongest signal is **Diagram type classifier** (chart, circuit, geometry). Its rule: Taxonomy. In the starter, the closest executable idea is **key facts**: the entity, amount and date every output must contain. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

The same outputs pass 18.0% under the strict judge and 47.0% under the fuzzy one, because valid formats are rejected by exact matching. The judges agree only moderately (kappa 0.40).

## 4. Baseline against the stronger design

Version 2 passes 60.8% against 47.0%: a difference of 13.8% with a 95% interval of 4.6% to 22.6%. With only 60 items the interval on one pass rate is 0.23 wide, against 0.13 on the full set.

| Result | Value |
|---|---|
| Pass rate v1, strict judge | 18.0% |
| Pass rate v1, fuzzy judge | 47.0% |
| Pass rate v2, fuzzy judge | 60.8% |
| v2 minus v1, 95% interval | 13.8% (4.6% to 22.6%) |
| Judge agreement (kappa) | 0.40 |

## 5. An edge case from the blueprint

**Complex diagrams (circuits) mis-described.** learners misled. Planned response: Specialist templates and mandatory review. Write the test that replays this case through your pipeline before you tune anything.

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
| `golden_items` | 217 |
| `v1_pass_rate_strict_judge` | 0.17972 |
| `v1_pass_rate_fuzzy_judge` | 0.47005 |
| `v2_pass_rate_fuzzy_judge` | 0.60829 |
| `v1_pass_rate_ci95` | 0.4054, 0.5393 |
| `v2_minus_v1` | 0.13825 |
| `v2_minus_v1_ci95` | 0.04597, 0.2258 |
| `judge_agreement_kappa_v1` | 0.39618 |
| `judge_disagreement_share_v1` | 0.29032 |
| `v1_failure_share_by_check.has_entity` | 0 |
| `v1_failure_share_by_check.amount_correct` | 0.48387 |
| `v1_failure_share_by_check.date_correct` | 0.13825 |
| `v1_failure_share_by_check.within_length` | 0.036866 |
| `v1_failure_share_by_check.no_forbidden_claims` | 0.059908 |
| `ci_width_at_60_items` | 0.23375 |
| `ci_width_at_full_set` | 0.13387 |

</details>
