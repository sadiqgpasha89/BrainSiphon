# Cross-Agency Data Sharing Purpose Gateway: how well the starter fits

> Generated from the blueprint `public-sector/data-sharing-purpose-gateway` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

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

- Score "Policy decision correctness on test cases" and "Minimisation compliance" instead of the kit metrics
- Replace the kit's models with the blueprint's: A policy gateway evaluating requests against purpose-tagged agreements and consent with field-level…

## Dimension by dimension

| Dimension | This use case needs | The engine provides | Status | Change |
|---|---|---|---|---|
| problem | Grounded question answering over documents: Check each cross-agency data request against its legal basis, purpose and consent before data is released, and log every share so people can see who used their data and… | Grounded question answering over documents | match |  |
| label | A correct, cited answer drawn from a document collection, or an abstention | Each golden question carries the expected value for the right document version, or none when the documents never state it; correct means the expected value or an abstention | match |  |
| validation | Golden question set including unanswerable questions; claim-level verification | Golden set with unanswerable questions held out by product, and a verifier that checks the cited passage | match |  |
| metrics | Policy decision correctness on test cases; Minimisation compliance; Latency at p99 | Answer accuracy, hallucination on unanswerable questions and abstention rate | adapt | Score "Policy decision correctness on test cases" and "Minimisation compliance" instead of the kit metrics |
| data | A versioned document collection | A versioned document collection with chunks, source types and intents | match |  |
| model | Baseline: Bilateral agreements and manual approval of each request, because it is the current process. Production: A policy gateway evaluating requests against purpose-tagged agreements and consent with field-level minimisat… | Hybrid retrieval, a source filter, an intent check and a verifier, with a deterministic stand-in for the language model | adapt | Replace the kit's models with the blueprint's: A policy gateway evaluating requests against purpose-tagged agreements and consent with field-level… |
| serving | Online decision inside about 100 milliseconds (p99 80 ms) | Offline harness only: no document ingestion, vector store, model gateway or answer API | outside-kit | Milestone M5 is yours: nothing in the kit serves traffic |
| integrations | Purpose code intake (API front end); Release or denial (gateway); Immutable log (append-only store) | None. A deterministic stand-in replaces the model; no provider or index is connected | outside-kit | Connect these on your own platform in M5 and M6; the kit connects to nothing |
