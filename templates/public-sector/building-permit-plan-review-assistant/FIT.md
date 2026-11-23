# Building Permit Plan Review Assistant: how well the starter fits

> Generated from the blueprint `public-sector/building-permit-plan-review-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

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

- Score "Flag precision and recall against reviewer findings" and "Measurement error" instead of the kit metrics

## Dimension by dimension

| Dimension | This use case needs | The engine provides | Status | Change |
|---|---|---|---|---|
| problem | Grounded question answering over documents: Pre-check building plans against code and zoning rules and highlight possible issues with references so plan reviewers focus on judgement and applicants fix problems ear… | Grounded question answering over documents | match |  |
| label | A correct, cited answer drawn from a document collection, or an abstention | Each golden question carries the expected value for the right document version, or none when the documents never state it; correct means the expected value or an abstention | match |  |
| validation | Golden question set including unanswerable questions; claim-level verification | Golden set with unanswerable questions held out by product, and a verifier that checks the cited passage | match |  |
| metrics | Flag precision and recall against reviewer findings; Measurement error; Citation accuracy | Answer accuracy, hallucination on unanswerable questions and abstention rate | adapt | Score "Flag precision and recall against reviewer findings" and "Measurement error" instead of the kit metrics |
| data | A versioned document collection | A versioned document collection with chunks, source types and intents | match |  |
| model | Baseline: Manual plan review by examiners using checklists, because it is the current process. Production: A plan reading pipeline with a rule engine that produces cited flags for reviewers and applicants, with an au… | Hybrid retrieval, a source filter, an intent check and a verifier, with a deterministic stand-in for the language model | match |  |
| serving | Interactive response in seconds (p99 2500 ms) | Offline harness only: no document ingestion, vector store, model gateway or answer API | outside-kit | Milestone M5 is yours: nothing in the kit serves traffic |
| integrations | Plan intake (permit portal); Reviewer decision (permit system): a person in the loop; Rule version log (audit store) | None. A deterministic stand-in replaces the model; no provider or index is connected | outside-kit | Connect these on your own platform in M5 and M6; the kit connects to nothing |
