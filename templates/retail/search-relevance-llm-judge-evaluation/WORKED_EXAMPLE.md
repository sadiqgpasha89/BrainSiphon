# Search Relevance Evaluation with LLM Judges: worked example

> Run on synthetic data with `generative` engine, seed 84915, knobs {"n": 265}, in 0.9 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Replace expensive human relevance labelling with calibrated LLM judges to evaluate ranking changes daily at scale.

**Constraints that shape the design.** Agreement with human raters; Bias auditing (position, verbosity); Cost per judgement

**Label in this use case.** For "Search Relevance Evaluation with LLM Judges": Replace expensive human relevance labelling with calibrated LLM judges to evaluate ranking changes daily at scale. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Judge and ranker share a base model.

## 2. Choose the signals

Your strongest signal is **Judge-human agreement** (Cohen's kappa on anchor set). Its rule: Refresh anchors quarterly. In the starter, the closest executable idea is **key facts**: the entity, amount and date every output must contain. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

The same outputs pass 15.1% under the strict judge and 48.7% under the fuzzy one, because valid formats are rejected by exact matching. The judges agree only moderately (kappa 0.32).

## 4. Baseline against the stronger design

Version 2 passes 67.5% against 48.7%: a difference of 18.9% with a 95% interval of 10.9% to 27.9%. With only 60 items the interval on one pass rate is 0.25 wide, against 0.13 on the full set.

| Result | Value |
|---|---|
| Pass rate v1, strict judge | 15.1% |
| Pass rate v1, fuzzy judge | 48.7% |
| Pass rate v2, fuzzy judge | 67.5% |
| v2 minus v1, 95% interval | 18.9% (10.9% to 27.9%) |
| Judge agreement (kappa) | 0.32 |

## 5. An edge case from the blueprint

**Judge model update.** judge scores shift after a model upgrade so metrics are not comparable over time. Planned response: Pin judge versions and re-calibrate on anchors. Write the test that replays this case through your pipeline before you tune anything.

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
| `golden_items` | 265 |
| `v1_pass_rate_strict_judge` | 0.15094 |
| `v1_pass_rate_fuzzy_judge` | 0.48679 |
| `v2_pass_rate_fuzzy_judge` | 0.67547 |
| `v1_pass_rate_ci95` | 0.4189, 0.5509 |
| `v2_minus_v1` | 0.18868 |
| `v2_minus_v1_ci95` | 0.1092, 0.2792 |
| `judge_agreement_kappa_v1` | 0.31568 |
| `judge_disagreement_share_v1` | 0.33585 |
| `v1_failure_share_by_check.has_entity` | 0 |
| `v1_failure_share_by_check.amount_correct` | 0.48679 |
| `v1_failure_share_by_check.date_correct` | 0.15094 |
| `v1_failure_share_by_check.within_length` | 0.011321 |
| `v1_failure_share_by_check.no_forbidden_claims` | 0.045283 |
| `ci_width_at_60_items` | 0.25042 |
| `ci_width_at_full_set` | 0.13208 |

</details>
