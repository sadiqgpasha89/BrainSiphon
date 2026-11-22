# Healthcare Regulatory Change Intelligence: how well the starter fits

> Generated from the blueprint `healthcare/healthcare-regulatory-change-intelligence` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

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

- Score "Change-detection recall on seeded amendments" and "Citation precision and unsupported-claim rate" instead of the kit metrics

## Dimension by dimension

| Dimension | This use case needs | The engine provides | Status | Change |
|---|---|---|---|---|
| problem | Grounded question answering over documents: Monitor approved official publications and identify changes that may apply to the organisation's jurisdiction, facility type and service lines, giving compliance experts… | Grounded question answering over documents | match |  |
| label | A correct, cited answer drawn from a document collection, or an abstention | Each golden question carries the expected value for the right document version, or none when the documents never state it; correct means the expected value or an abstention | match |  |
| validation | Golden question set including unanswerable questions; claim-level verification | Golden set with unanswerable questions held out by product, and a verifier that checks the cited passage | match |  |
| metrics | Change-detection recall on seeded amendments; Citation precision and unsupported-claim rate; Applicability-candidate recall at the review capacity | Answer accuracy, hallucination on unanswerable questions and abstention rate | adapt | Score "Change-detection recall on seeded amendments" and "Citation precision and unsupported-claim rate" instead of the kit metrics |
| data | A versioned document collection | A versioned document collection with chunks, source types and intents | match |  |
| model | Baseline: A compliance analyst reads publisher newsletters and a manual tracker. Production: Scheduled ingestion from approved sources into a versioned store, structural and semantic change detection, h… | Hybrid retrieval, a source filter, an intent check and a verifier, with a deterministic stand-in for the language model | match |  |
| serving | Scheduled batch run | Offline harness only: no document ingestion, vector store, model gateway or answer API | outside-kit | Milestone M5 is yours: nothing in the kit serves traffic |
| integrations | Source ingestion (scheduled fetchers); Versioned document store (object store with lineage); Applicability candidate ranker (rules with embeddings); Compliance expert review (human): a person in the loop; Decision and audit log (case system) | None. A deterministic stand-in replaces the model; no provider or index is connected | outside-kit | Connect these on your own platform in M5 and M6; the kit connects to nothing |
