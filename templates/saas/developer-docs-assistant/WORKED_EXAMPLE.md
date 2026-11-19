# Developer Documentation Assistant: worked example

> Run on synthetic data with Hand-written starter, in 0.8 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Answer developer questions about APIs and SDKs with correct, version-specific code snippets and links to authoritative docs.

**Constraints that shape the design.** Version-aware answers; Code must compile; No invented endpoints

**Label in this use case.** For "Developer Documentation Assistant": Answer developer questions about APIs and SDKs with correct, version-specific code snippets and links to authoritative docs. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating on questions from docs headings.

## 2. Choose the signals

Your strongest signal is **API existence check** (referenced symbols found in spec). Its rule: Use the OpenAPI spec for the user's version. In the starter, the closest executable idea is ****: . Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

This pack ships a hand-written starter with its own data generator, written to plant the traps named in the blueprint. Its README lists them one by one, and its tests make each one executable.

## 4. Baseline against the stronger design

The starter runs a baseline and a stronger design under the evaluation discipline the blueprint prescribes. The table at the end of this page lists every number from this run.

| Result | Value |
|---|---|
| chunks | 132 |
| golden | 132 |
| test_questions | 66 |
| naive.answerable | 48 |
| naive.unanswerable | 18 |
| naive.accuracy | 0.6042 |

## 5. An edge case from the blueprint

**Deprecated API still in older docs.** a deprecated API is recommended and the developer's code breaks. Planned response: Deprecation metadata and warnings. Write the test that replays this case through your pipeline before you tune anything.

## 6. What to expect on your own data

Read starter/README.md for the milestone-by-milestone expectations; then replace the synthetic generator with your data and keep the tests.

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
| `naive.accuracy` | 0.60417 |
| `naive.answered_precision` | 0.60417 |
| `naive.abstained_on_answerable` | 0 |
| `naive.hallucination_rate` | 1 |
| `naive.stale_or_changelog_errors` | 6 |
| `naive.recall@5` | 1 |
| `naive.citation_support` | 1 |
| `guarded.answerable` | 48 |
| `guarded.unanswerable` | 18 |
| `guarded.accuracy` | 0.72917 |
| `guarded.answered_precision` | 1 |
| `guarded.abstained_on_answerable` | 0.27083 |
| `guarded.hallucination_rate` | 0 |
| `guarded.stale_or_changelog_errors` | 0 |
| `guarded.recall@5` | 1 |
| `guarded.citation_support` | 1 |

</details>
