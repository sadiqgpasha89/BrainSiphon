# Lessons Learned Retrieval: how well the starter fits

> Generated from the blueprint `engineering/lessons-learned-retrieval` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Engine:** `llm-rag` (Retrieval-augmented answering with a verifier) · **Fit:** adaptable · **Problem type:** `grounded-qa`

The `llm-rag` engine implements a neighbouring problem. This use case is `grounded-qa`: the engine supplies reusable parts (data generation with the traps, the evaluation discipline, the tests), and the changes below turn it into this system's starter.

## Traps the synthetic data plants

- Letting changelogs be answer sources
- Never abstaining
- Abstaining too much
- Tuning on the test set

## What the starter does not do

- It runs on synthetic data. A model that does well here has shown the mechanics work, not that it will do well on yours.
- It is not production code: no serving layer, no auth, no secrets handling.
- Milestones M5 and M6 (serving and rollout) are never supplied by a starter; use the deployment folder and your platform.

## Changes to make before you rely on it

- Score "Retrieval relevance" and "Redaction recall" instead of the kit metrics

## Dimension by dimension

| Dimension | This use case needs | The engine provides | Status | Change |
|---|---|---|---|---|
| problem | Grounded question answering over documents: Capture lessons from project closeouts and incident reports and surface relevant ones at design, bid and planning stages with source links | Grounded question answering over documents | match |  |
| label | A correct, cited answer drawn from a document collection, or an abstention | Each golden question carries the expected value for the right document version, or none when the documents never state it; correct means the expected value or an abstention | match |  |
| validation | Golden question set including unanswerable questions; claim-level verification | Golden set with unanswerable questions held out by product, and a verifier that checks the cited passage | match |  |
| metrics | Retrieval relevance; Redaction recall; Owner acceptance | Answer accuracy, hallucination on unanswerable questions and abstention rate | adapt | Score "Retrieval relevance" and "Redaction recall" instead of the kit metrics |
| data | A versioned document collection | A versioned document collection with chunks, source types and intents | match |  |
| model | Baseline: Lessons registers rarely consulted after closeout, because they are the usual practice. Production: A retrieval service that structures and redacts lessons, links them to project phases and pushes the most rel… | Hybrid retrieval, a source filter, an intent check and a verifier, with a deterministic stand-in for the language model | match |  |
| serving | Interactive response in seconds (p99 2500 ms) | Offline harness only: no document ingestion, vector store, model gateway or answer API | outside-kit | Milestone M5 is yours: nothing in the kit serves traffic |
| integrations | Closeout intake (project systems); Context push (planning tools); Usage feedback (UI); Review of lessons (yearly): a person in the loop | None. A deterministic stand-in replaces the model; no provider or index is connected | outside-kit | Connect these on your own platform in M5 and M6; the kit connects to nothing |
