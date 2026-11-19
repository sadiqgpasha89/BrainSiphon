# RAG Quality Monitoring in Production: worked example

> Run on synthetic data with `generative` engine, seed 63831, knobs {"n": 283}, in 0.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Monitor retrieval relevance, groundedness and user outcomes of RAG apps in production, spotting content gaps and regressions.

**Constraints that shape the design.** Online sampling cost; Privacy of queries; Per-tenant indexes

**Label in this use case.** For "RAG Quality Monitoring in Production": Monitor retrieval relevance, groundedness and user outcomes of RAG apps in production, spotting content gaps and regressions. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Ratings used as quality.

## 2. Choose the signals

Your strongest signal is **Retrieval hit rate on judged queries** (gold passage in top-k). Its rule: Labels. In the starter, the closest executable idea is **key facts**: the entity, amount and date every output must contain. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

The same outputs pass 16.3% under the strict judge and 50.9% under the fuzzy one, because valid formats are rejected by exact matching. The judges agree only moderately (kappa 0.32).

## 4. Baseline against the stronger design

Version 2 passes 61.5% against 50.9%: a difference of 10.6% with a 95% interval of 2.5% to 18.7%. With only 60 items the interval on one pass rate is 0.25 wide, against 0.12 on the full set.

| Result | Value |
|---|---|
| Pass rate v1, strict judge | 16.3% |
| Pass rate v1, fuzzy judge | 50.9% |
| Pass rate v2, fuzzy judge | 61.5% |
| v2 minus v1, 95% interval | 10.6% (2.5% to 18.7%) |
| Judge agreement (kappa) | 0.32 |

## 5. An edge case from the blueprint

**Index update lags.** the retrieval index lags behind content changes, so answers are stale. Planned response: Index freshness SLOs and freshness checks in monitoring. Write the test that replays this case through your pipeline before you tune anything.

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
| `golden_items` | 283 |
| `v1_pass_rate_strict_judge` | 0.16254 |
| `v1_pass_rate_fuzzy_judge` | 0.50883 |
| `v2_pass_rate_fuzzy_judge` | 0.61484 |
| `v1_pass_rate_ci95` | 0.4488, 0.5724 |
| `v2_minus_v1` | 0.10601 |
| `v2_minus_v1_ci95` | 0.02456, 0.1873 |
| `judge_agreement_kappa_v1` | 0.31558 |
| `judge_disagreement_share_v1` | 0.34629 |
| `v1_failure_share_by_check.has_entity` | 0 |
| `v1_failure_share_by_check.amount_correct` | 0.44523 |
| `v1_failure_share_by_check.date_correct` | 0.14488 |
| `v1_failure_share_by_check.within_length` | 0.024735 |
| `v1_failure_share_by_check.no_forbidden_claims` | 0.042403 |
| `ci_width_at_60_items` | 0.25 |
| `ci_width_at_full_set` | 0.12367 |

</details>
