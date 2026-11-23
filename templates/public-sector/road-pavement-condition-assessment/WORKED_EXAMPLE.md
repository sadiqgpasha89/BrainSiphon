# Road Pavement Condition Assessment: worked example

> Run on synthetic data with `generative` engine, seed 17965, knobs {"n": 226}, in 1.8 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Measure cracks, potholes and rutting from vehicle-mounted and drone imagery so maintenance budgets target the roads that need repair.

**Constraints that shape the design.** Condition index per road segment with the image evidence; Safety hazards flagged to a person immediately; Engineer confirms before treatment

**Label in this use case.** For "Road Pavement Condition Assessment": Measure cracks, potholes and rutting from vehicle-mounted and drone imagery so maintenance budgets target the roads that need repair. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Raw image storage.

## 2. Choose the signals

Your strongest signal is **Crack and pothole detection** (model score per defect). Its rule: Calibrated. In the starter, the closest executable idea is **key facts**: the entity, amount and date every output must contain. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

The same outputs pass 17.7% under the strict judge and 43.8% under the fuzzy one, because valid formats are rejected by exact matching. The judges agree only moderately (kappa 0.43).

## 4. Baseline against the stronger design

Version 2 passes 65.5% against 43.8%: a difference of 21.7% with a 95% interval of 13.7% to 29.6%. With only 60 items the interval on one pass rate is 0.23 wide, against 0.12 on the full set.

| Result | Value |
|---|---|
| Pass rate v1, strict judge | 17.7% |
| Pass rate v1, fuzzy judge | 43.8% |
| Pass rate v2, fuzzy judge | 65.5% |
| v2 minus v1, 95% interval | 21.7% (13.7% to 29.6%) |
| Judge agreement (kappa) | 0.43 |

## 5. An edge case from the blueprint

**Wet road.** glare hides cracks. Planned response: Weather-aware filtering and re-survey. Write the test that replays this case through your pipeline before you tune anything.

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
| `golden_items` | 226 |
| `v1_pass_rate_strict_judge` | 0.17699 |
| `v1_pass_rate_fuzzy_judge` | 0.43805 |
| `v2_pass_rate_fuzzy_judge` | 0.65487 |
| `v1_pass_rate_ci95` | 0.3805, 0.5001 |
| `v2_minus_v1` | 0.21681 |
| `v2_minus_v1_ci95` | 0.1372, 0.2965 |
| `judge_agreement_kappa_v1` | 0.43245 |
| `judge_disagreement_share_v1` | 0.26106 |
| `v1_failure_share_by_check.has_entity` | 0 |
| `v1_failure_share_by_check.amount_correct` | 0.50885 |
| `v1_failure_share_by_check.date_correct` | 0.14159 |
| `v1_failure_share_by_check.within_length` | 0.026549 |
| `v1_failure_share_by_check.no_forbidden_claims` | 0.070796 |
| `ci_width_at_60_items` | 0.23375 |
| `ci_width_at_full_set` | 0.11958 |

</details>
