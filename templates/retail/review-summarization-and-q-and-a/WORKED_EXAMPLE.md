# Review Summarisation & Product Q&A: worked example

> Run on synthetic data with `llm-rag` engine, seed 13029, knobs {}, in 0.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Summarise thousands of reviews into balanced pros/cons and answer product questions with citations from reviews and specs.

**Constraints that shape the design.** Balanced, not cherry-picked; Cite review IDs; Cost per product page cached

**Label in this use case.** For "Review Summarisation & Product Q&A": Summarise thousands of reviews into balanced pros/cons and answer product questions with citations from reviews and specs. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Summaries judged for fluency not support.

## 2. Choose the signals

Your strongest signal is **Aspect coverage** (share of frequent aspects represented). Its rule: Aspects extracted offline. In the starter, the closest executable idea is **source type**: reference, tutorial or changelog, so factual answers come only from reference pages. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Questions with no answer in the corpus are answered anyway by a naive pipeline: it hallucinated on 100.0% of them. Stale or superseded passages caused 5 errors.

## 4. Baseline against the stronger design

The guarded pipeline checks that every claim cites a supporting passage and abstains otherwise: hallucination 0.0%, answered precision 100.0%, at the cost of declining 41.7% of answerable questions.

| Result | Value |
|---|---|
| Hallucination rate, naive | 100.0% |
| Hallucination rate, guarded | 0.0% |
| Answered precision, naive | 68.8% |
| Answered precision, guarded | 100.0% |
| Answerable questions it declined, guarded | 41.7% |

## 5. An edge case from the blueprint

**New product with 3 reviews.** summary overconfident. Planned response: Minimum-evidence rule and uncertainty wording. Write the test that replays this case through your pipeline before you tune anything.

## 6. What to expect on your own data

The language model here is a deterministic stand-in so the harness is exact; the harness, the golden set and the abstention metric carry over to a real model. Re-measure everything with your model.

## 7. Do this next

1. `cd starter && make setup && make demo` to reproduce the table above.
2. Replace the synthetic generator with an extract of your data and keep the split, the leakage tests and the gates.
3. Run through `docs/02-delivery-plan.md` milestone by milestone; each exit gate is a number you can check.

<details>
<summary>Every number from this run</summary>

| Metric | Value |
|---|---|
| `chunks` | 132 |
| `golden` | 132 |
| `test_questions` | 66 |
| `naive.answerable` | 48 |
| `naive.unanswerable` | 18 |
| `naive.accuracy` | 0.6875 |
| `naive.answered_precision` | 0.6875 |
| `naive.abstained_on_answerable` | 0 |
| `naive.hallucination_rate` | 1 |
| `naive.stale_or_changelog_errors` | 5 |
| `naive.recall@5` | 1 |
| `naive.citation_support` | 1 |
| `guarded.answerable` | 48 |
| `guarded.unanswerable` | 18 |
| `guarded.accuracy` | 0.58333 |
| `guarded.answered_precision` | 1 |
| `guarded.abstained_on_answerable` | 0.41667 |
| `guarded.hallucination_rate` | 0 |
| `guarded.stale_or_changelog_errors` | 0 |
| `guarded.recall@5` | 1 |
| `guarded.citation_support` | 1 |

</details>
