# Solar Generation Forecasting: worked example

> Run on synthetic data with `generative` engine, seed 27670, knobs {"n": 286}, in 1.8 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast solar generation per plant and for distributed rooftop fleets from irradiance forecasts, satellite cloud motion and plant telemetry so balancing and curtailment decisions improve.

**Constraints that shape the design.** Forecasts at 15-minute resolution up to 48 hours; Nowcasts for the next 4 hours from satellite; Quantile output

**Label in this use case.** For "Solar Generation Forecasting": Forecast solar generation per plant and for distributed rooftop fleets from irradiance forecasts, satellite cloud motion and plant telemetry so balancing and curtailment decisions improve. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Nameplate capacity as truth.

## 2. Choose the signals

Your strongest signal is **Forecast irradiance** (numerical weather model irradiance). Its rule: From the weather feed. In the starter, the closest executable idea is **key facts**: the entity, amount and date every output must contain. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

The same outputs pass 16.1% under the strict judge and 45.8% under the fuzzy one, because valid formats are rejected by exact matching. The judges agree only moderately (kappa 0.37).

## 4. Baseline against the stronger design

Version 2 passes 60.8% against 45.8%: a difference of 15.0% with a 95% interval of 7.0% to 22.0%. With only 60 items the interval on one pass rate is 0.25 wide, against 0.12 on the full set.

| Result | Value |
|---|---|
| Pass rate v1, strict judge | 16.1% |
| Pass rate v1, fuzzy judge | 45.8% |
| Pass rate v2, fuzzy judge | 60.8% |
| v2 minus v1, 95% interval | 15.0% (7.0% to 22.0%) |
| Judge agreement (kappa) | 0.37 |

## 5. An edge case from the blueprint

**Fast cloud edge.** ramps change within minutes. Planned response: Nowcast updates and ramp alerts. Write the test that replays this case through your pipeline before you tune anything.

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
| `v1_pass_rate_strict_judge` | 0.16084 |
| `v1_pass_rate_fuzzy_judge` | 0.45804 |
| `v2_pass_rate_fuzzy_judge` | 0.60839 |
| `v1_pass_rate_ci95` | 0.402, 0.521 |
| `v2_minus_v1` | 0.15035 |
| `v2_minus_v1_ci95` | 0.06993, 0.2204 |
| `judge_agreement_kappa_v1` | 0.36972 |
| `judge_disagreement_share_v1` | 0.2972 |
| `v1_failure_share_by_check.has_entity` | 0 |
| `v1_failure_share_by_check.amount_correct` | 0.4965 |
| `v1_failure_share_by_check.date_correct` | 0.16084 |
| `v1_failure_share_by_check.within_length` | 0.020979 |
| `v1_failure_share_by_check.no_forbidden_claims` | 0.055944 |
| `ci_width_at_60_items` | 0.25042 |
| `ci_width_at_full_set` | 0.11897 |

</details>
