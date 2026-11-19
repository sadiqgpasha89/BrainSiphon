# Property Manager Assistant for Tenant Queries: how well the starter fits

> Generated from the blueprint `real-estate/tenant-query-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Engine:** `llm-rag` (Retrieval-augmented answering with a verifier) · **Fit:** exact · **Problem type:** `grounded-qa`

The `llm-rag` engine implements this problem type (`grounded-qa`) as it is. Its synthetic data, split, metrics and tests are the ones this use case needs, with your signals mapped onto the engine's features.

## Traps the synthetic data plants

- Letting changelogs be answer sources
- Never abstaining
- Abstaining too much
- Tuning on the test set

## What the starter does not do

- It runs on synthetic data. A model that does well here has shown the mechanics work, not that it will do well on yours.
- It is not production code: no serving layer, no auth, no secrets handling.
- Milestones M5 and M6 (serving and rollout) are never supplied by a starter; use the deployment folder and your platform.

## Changes to make

None required for the mechanics. Replace the synthetic generator with your extract, and keep the split, the leakage tests and the gates.

## Dimension by dimension

| Dimension | This use case needs | The engine provides | Status | Change |
|---|---|---|---|---|
| problem | Grounded question answering over documents: Answer tenants' questions about leases, rules, payments and repairs from the manager's documents and systems and escalate what needs a person | Grounded question answering over documents | match |  |
| label | A correct, cited answer drawn from a document collection, or an abstention | Each golden question carries the expected value for the right document version, or none when the documents never state it; correct means the expected value or an abstention | match |  |
| validation | Golden question set including unanswerable questions; claim-level verification | Golden set with unanswerable questions held out by product, and a verifier that checks the cited passage | match |  |
| metrics | Citation validity; Escalation F1 | Answer accuracy, hallucination on unanswerable questions and abstention rate | match |  |
| data | A versioned document collection | A versioned document collection with chunks, source types and intents | match |  |
| model | Baseline: FAQ page and an inbox, because it is the current process. Production: Retrieval over leases and policies, typed tools for balance and tickets, verifier and escalation | Hybrid retrieval, a source filter, an intent check and a verifier, with a deterministic stand-in for the language model | match |  |
| serving | Interactive response in seconds (p99 2500 ms) | Offline harness only: no document ingestion, vector store, model gateway or answer API | outside-kit | Milestone M5 is yours: nothing in the kit serves traffic |
| integrations | Message intake (app and chat); Retriever (hybrid search); Typed tools (ledger and tickets); Escalation (case tool): a person in the loop | None. A deterministic stand-in replaces the model; no provider or index is connected | outside-kit | Connect these on your own platform in M5 and M6; the kit connects to nothing |
