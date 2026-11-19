# Macroeconomic Scenario Generation for Stress Tests: worked example

> Run on synthetic data with `generative` engine, seed 39055, knobs {"n": 293}, in 0.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Generate internally consistent macroeconomic paths for stress testing, translating a narrative (for example a property crash) into variables used by credit and market models.

**Constraints that shape the design.** Paths must be internally coherent (GDP, unemployment, rates, house prices); Regulator scenarios reproduced exactly; Scenario rationale documented

**Label in this use case.** For "Macroeconomic Scenario Generation for Stress Tests": Generate internally consistent macroeconomic paths for stress testing, translating a narrative (for example a property crash) into variables used by credit and market models. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Fitting on 2010-2019 gives mild shocks.

## 2. Choose the signals

Your strongest signal is **VAR impulse responses** (estimated responses of variables to a shock to one variable). Its rule: Short histories give unstable estimates. In the starter, the closest executable idea is **key facts**: the entity, amount and date every output must contain. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

The same outputs pass 17.1% under the strict judge and 48.1% under the fuzzy one, because valid formats are rejected by exact matching. The judges agree only moderately (kappa 0.36).

## 4. Baseline against the stronger design

Version 2 passes 60.8% against 48.1%: a difference of 12.6% with a 95% interval of 4.8% to 20.5%. With only 60 items the interval on one pass rate is 0.25 wide, against 0.11 on the full set.

| Result | Value |
|---|---|
| Pass rate v1, strict judge | 17.1% |
| Pass rate v1, fuzzy judge | 48.1% |
| Pass rate v2, fuzzy judge | 60.8% |
| v2 minus v1, 95% interval | 12.6% (4.8% to 20.5%) |
| Judge agreement (kappa) | 0.36 |

## 5. An edge case from the blueprint

**Structural break.** pre-break relationships no longer hold. Planned response: Break tests and re-estimation windows. Write the test that replays this case through your pipeline before you tune anything.

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
| `golden_items` | 293 |
| `v1_pass_rate_strict_judge` | 0.17065 |
| `v1_pass_rate_fuzzy_judge` | 0.48123 |
| `v2_pass_rate_fuzzy_judge` | 0.60751 |
| `v1_pass_rate_ci95` | 0.4232, 0.5358 |
| `v2_minus_v1` | 0.12628 |
| `v2_minus_v1_ci95` | 0.04778, 0.2049 |
| `judge_agreement_kappa_v1` | 0.36309 |
| `judge_disagreement_share_v1` | 0.31058 |
| `v1_failure_share_by_check.has_entity` | 0 |
| `v1_failure_share_by_check.amount_correct` | 0.48464 |
| `v1_failure_share_by_check.date_correct` | 0.13993 |
| `v1_failure_share_by_check.within_length` | 0.023891 |
| `v1_failure_share_by_check.no_forbidden_claims` | 0.051195 |
| `ci_width_at_60_items` | 0.25 |
| `ci_width_at_full_set` | 0.11263 |

</details>
