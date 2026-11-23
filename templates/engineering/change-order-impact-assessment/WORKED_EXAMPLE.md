# Change Order Impact Assessment: worked example

> Run on synthetic data with `generative` engine, seed 78863, knobs {"n": 263}, in 1.8 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Estimate the cost and time impact of proposed changes and link them to the contract basis so commercial managers evaluate and negotiate with evidence.

**Constraints that shape the design.** Estimates shown as ranges with assumptions; Commercial managers decide; Contract entitlement checked by counsel

**Label in this use case.** For "Change Order Impact Assessment": Estimate the cost and time impact of proposed changes and link them to the contract basis so commercial managers evaluate and negotiate with evidence. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Verbal agreements as basis.

## 2. Choose the signals

Your strongest signal is **Change scope** (what changes in the design). Its rule: From the change request. In the starter, the closest executable idea is **key facts**: the entity, amount and date every output must contain. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

The same outputs pass 15.2% under the strict judge and 47.9% under the fuzzy one, because valid formats are rejected by exact matching. The judges agree only moderately (kappa 0.33).

## 4. Baseline against the stronger design

Version 2 passes 61.2% against 47.9%: a difference of 13.3% with a 95% interval of 4.2% to 20.9%. With only 60 items the interval on one pass rate is 0.27 wide, against 0.12 on the full set.

| Result | Value |
|---|---|
| Pass rate v1, strict judge | 15.2% |
| Pass rate v1, fuzzy judge | 47.9% |
| Pass rate v2, fuzzy judge | 61.2% |
| v2 minus v1, 95% interval | 13.3% (4.2% to 20.9%) |
| Judge agreement (kappa) | 0.33 |

## 5. An edge case from the blueprint

**Disputed scope.** parties disagree on scope. Planned response: Evidence pack and neutral log. Write the test that replays this case through your pipeline before you tune anything.

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
| `golden_items` | 263 |
| `v1_pass_rate_strict_judge` | 0.15209 |
| `v1_pass_rate_fuzzy_judge` | 0.47909 |
| `v2_pass_rate_fuzzy_judge` | 0.61217 |
| `v1_pass_rate_ci95` | 0.4183, 0.5361 |
| `v2_minus_v1` | 0.13308 |
| `v2_minus_v1_ci95` | 0.04183, 0.2091 |
| `judge_agreement_kappa_v1` | 0.3264 |
| `judge_disagreement_share_v1` | 0.327 |
| `v1_failure_share_by_check.has_entity` | 0 |
| `v1_failure_share_by_check.amount_correct` | 0.47529 |
| `v1_failure_share_by_check.date_correct` | 0.1597 |
| `v1_failure_share_by_check.within_length` | 0.026616 |
| `v1_failure_share_by_check.no_forbidden_claims` | 0.064639 |
| `ci_width_at_60_items` | 0.26667 |
| `ci_width_at_full_set` | 0.11787 |

</details>
