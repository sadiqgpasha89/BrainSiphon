# Admissions & Student Support Assistant: worked example

> Run on synthetic data with `llm-rag` engine, seed 20616, knobs {}, in 0.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Answer applicants' and students' questions about admissions, fees, deadlines and services accurately, escalating to staff when needed.

**Constraints that shape the design.** Accuracy on deadlines and fees; Version-aware policies; Multilingual

**Label in this use case.** For "Admissions & Student Support Assistant": Answer applicants' and students' questions about admissions, fees, deadlines and services accurately, escalating to staff when needed. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Golden set not updated for the new cycle.

## 2. Choose the signals

Your strongest signal is **Source recency** (effective date of cited document). Its rule: Metadata. In the starter, the closest executable idea is **source type**: reference, tutorial or changelog, so factual answers come only from reference pages. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Questions with no answer in the corpus are answered anyway by a naive pipeline: it hallucinated on 100.0% of them. Stale or superseded passages caused 5 errors.

## 4. Baseline against the stronger design

The guarded pipeline checks that every claim cites a supporting passage and abstains otherwise: hallucination 0.0%, answered precision 100.0%, at the cost of declining 33.3% of answerable questions.

| Result | Value |
|---|---|
| Hallucination rate, naive | 100.0% |
| Hallucination rate, guarded | 0.0% |
| Answered precision, naive | 58.3% |
| Answered precision, guarded | 100.0% |
| Answerable questions it declined, guarded | 33.3% |

## 5. An edge case from the blueprint

**Policy changed this week.** assistant quotes the old deadline. Planned response: Change feed triggers re-index and shows effective dates. Write the test that replays this case through your pipeline before you tune anything.

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
| `naive.accuracy` | 0.58333 |
| `naive.answered_precision` | 0.58333 |
| `naive.abstained_on_answerable` | 0 |
| `naive.hallucination_rate` | 1 |
| `naive.stale_or_changelog_errors` | 5 |
| `naive.recall@5` | 1 |
| `naive.citation_support` | 1 |
| `guarded.answerable` | 48 |
| `guarded.unanswerable` | 18 |
| `guarded.accuracy` | 0.66667 |
| `guarded.answered_precision` | 1 |
| `guarded.abstained_on_answerable` | 0.33333 |
| `guarded.hallucination_rate` | 0 |
| `guarded.stale_or_changelog_errors` | 0 |
| `guarded.recall@5` | 1 |
| `guarded.citation_support` | 1 |

</details>
