# Fatigue Life Estimation: worked example

> Run on synthetic data with `generative` engine, seed 28376, knobs {"n": 217}, in 1.8 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Estimate fatigue damage accumulation in structures and components from measured load histories, to plan inspections and repairs with safety margins.

**Constraints that shape the design.** Damage estimates include uncertainty; Safety factors from codes applied; Engineers approve inspection plans

**Label in this use case.** For "Fatigue Life Estimation": Estimate fatigue damage accumulation in structures and components from measured load histories, to plan inspections and repairs with safety margins. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Average load.

## 2. Choose the signals

Your strongest signal is **Load cycle histogram** (counted cycles and ranges). Its rule: From sensor data. In the starter, the closest executable idea is **key facts**: the entity, amount and date every output must contain. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

The same outputs pass 21.2% under the strict judge and 47.9% under the fuzzy one, because valid formats are rejected by exact matching. The judges agree only moderately (kappa 0.45).

## 4. Baseline against the stronger design

Version 2 passes 60.4% against 47.9%: a difference of 12.4% with a 95% interval of 4.1% to 22.1%. With only 60 items the interval on one pass rate is 0.22 wide, against 0.14 on the full set.

| Result | Value |
|---|---|
| Pass rate v1, strict judge | 21.2% |
| Pass rate v1, fuzzy judge | 47.9% |
| Pass rate v2, fuzzy judge | 60.4% |
| v2 minus v1, 95% interval | 12.4% (4.1% to 22.1%) |
| Judge agreement (kappa) | 0.45 |

## 5. An edge case from the blueprint

**Overload event.** one extreme load occurs. Planned response: Event damage checks. Write the test that replays this case through your pipeline before you tune anything.

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
| `v1_pass_rate_strict_judge` | 0.21198 |
| `v1_pass_rate_fuzzy_judge` | 0.47926 |
| `v2_pass_rate_fuzzy_judge` | 0.60369 |
| `v1_pass_rate_ci95` | 0.4101, 0.553 |
| `v2_minus_v1` | 0.12442 |
| `v2_minus_v1_ci95` | 0.04147, 0.2212 |
| `judge_agreement_kappa_v1` | 0.45235 |
| `judge_disagreement_share_v1` | 0.26728 |
| `v1_failure_share_by_check.has_entity` | 0 |
| `v1_failure_share_by_check.amount_correct` | 0.5023 |
| `v1_failure_share_by_check.date_correct` | 0.15668 |
| `v1_failure_share_by_check.within_length` | 0 |
| `v1_failure_share_by_check.no_forbidden_claims` | 0.046083 |
| `ci_width_at_60_items` | 0.21667 |
| `ci_width_at_full_set` | 0.14286 |

</details>
