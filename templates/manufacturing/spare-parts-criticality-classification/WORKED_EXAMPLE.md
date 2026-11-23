# Spare Parts Criticality Classification: worked example

> Run on synthetic data with `generative` engine, seed 57457, knobs {"n": 247}, in 1.9 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Classify spare parts by the downtime cost of being out of stock and by failure likelihood, so stocking policy covers critical parts at the right level.

**Constraints that shape the design.** Criticality decisions reviewed by reliability engineers; Safety-critical parts always held; Annual review with quarterly updates

**Label in this use case.** For "Spare Parts Criticality Classification": Classify spare parts by the downtime cost of being out of stock and by failure likelihood, so stocking policy covers critical parts at the right level. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Classifying by spend alone.

## 2. Choose the signals

Your strongest signal is **Equipment downtime cost** (cost per hour of the asset the part serves). Its rule: From finance and production. In the starter, the closest executable idea is **key facts**: the entity, amount and date every output must contain. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

The same outputs pass 17.0% under the strict judge and 44.1% under the fuzzy one, because valid formats are rejected by exact matching. The judges agree only moderately (kappa 0.41).

## 4. Baseline against the stronger design

Version 2 passes 55.9% against 44.1%: a difference of 11.7% with a 95% interval of 3.2% to 20.3%. With only 60 items the interval on one pass rate is 0.27 wide, against 0.12 on the full set.

| Result | Value |
|---|---|
| Pass rate v1, strict judge | 17.0% |
| Pass rate v1, fuzzy judge | 44.1% |
| Pass rate v2, fuzzy judge | 55.9% |
| v2 minus v1, 95% interval | 11.7% (3.2% to 20.3%) |
| Judge agreement (kappa) | 0.41 |

## 5. An edge case from the blueprint

**Rarely used critical part.** there is little usage history. Planned response: Expert override with a reason. Write the test that replays this case through your pipeline before you tune anything.

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
| `golden_items` | 247 |
| `v1_pass_rate_strict_judge` | 0.17004 |
| `v1_pass_rate_fuzzy_judge` | 0.4413 |
| `v2_pass_rate_fuzzy_judge` | 0.5587 |
| `v1_pass_rate_ci95` | 0.3806, 0.5021 |
| `v2_minus_v1` | 0.11741 |
| `v2_minus_v1_ci95` | 0.03239, 0.2025 |
| `judge_agreement_kappa_v1` | 0.41193 |
| `judge_disagreement_share_v1` | 0.27126 |
| `v1_failure_share_by_check.has_entity` | 0 |
| `v1_failure_share_by_check.amount_correct` | 0.49393 |
| `v1_failure_share_by_check.date_correct` | 0.14575 |
| `v1_failure_share_by_check.within_length` | 0.040486 |
| `v1_failure_share_by_check.no_forbidden_claims` | 0.064777 |
| `ci_width_at_60_items` | 0.26667 |
| `ci_width_at_full_set` | 0.12156 |

</details>
