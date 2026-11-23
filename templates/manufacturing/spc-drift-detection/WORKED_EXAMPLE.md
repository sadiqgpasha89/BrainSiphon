# Statistical Process Control Drift Detection: worked example

> Run on synthetic data with `generative` engine, seed 3596, knobs {"n": 236}, in 1.9 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect slow drifts and shifts in process measurements earlier than classic control charts while keeping the false alarm rate low enough for operators to act.

**Constraints that shape the design.** Alert false alarm rate under one per line per week; Interpretable charts operators know; Limits per product and tool

**Label in this use case.** For "Statistical Process Control Drift Detection": Detect slow drifts and shifts in process measurements earlier than classic control charts while keeping the false alarm rate low enough for operators to act. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: One limit for mixed populations.

## 2. Choose the signals

Your strongest signal is **CUSUM statistic** (cumulative sum of deviations from the target). Its rule: Reset after corrective action. In the starter, the closest executable idea is **key facts**: the entity, amount and date every output must contain. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

The same outputs pass 16.5% under the strict judge and 48.7% under the fuzzy one, because valid formats are rejected by exact matching. The judges agree only moderately (kappa 0.34).

## 4. Baseline against the stronger design

Version 2 passes 61.0% against 48.7%: a difference of 12.3% with a 95% interval of 3.0% to 21.2%. With only 60 items the interval on one pass rate is 0.25 wide, against 0.13 on the full set.

| Result | Value |
|---|---|
| Pass rate v1, strict judge | 16.5% |
| Pass rate v1, fuzzy judge | 48.7% |
| Pass rate v2, fuzzy judge | 61.0% |
| v2 minus v1, 95% interval | 12.3% (3.0% to 21.2%) |
| Judge agreement (kappa) | 0.34 |

## 5. An edge case from the blueprint

**Planned recipe change.** the process shifts on purpose. Planned response: Recipe change events reset the baseline. Write the test that replays this case through your pipeline before you tune anything.

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
| `golden_items` | 236 |
| `v1_pass_rate_strict_judge` | 0.16525 |
| `v1_pass_rate_fuzzy_judge` | 0.48729 |
| `v2_pass_rate_fuzzy_judge` | 0.61017 |
| `v1_pass_rate_ci95` | 0.4237, 0.551 |
| `v2_minus_v1` | 0.12288 |
| `v2_minus_v1_ci95` | 0.02956, 0.2119 |
| `judge_agreement_kappa_v1` | 0.34478 |
| `judge_disagreement_share_v1` | 0.32203 |
| `v1_failure_share_by_check.has_entity` | 0 |
| `v1_failure_share_by_check.amount_correct` | 0.4661 |
| `v1_failure_share_by_check.date_correct` | 0.13136 |
| `v1_failure_share_by_check.within_length` | 0.021186 |
| `v1_failure_share_by_check.no_forbidden_claims` | 0.059322 |
| `ci_width_at_60_items` | 0.25042 |
| `ci_width_at_full_set` | 0.12722 |

</details>
