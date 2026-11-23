# Release Notes Generation: how well the starter fits

> Generated from the blueprint `devtools/release-notes-generation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Engine:** `llm-rag` (Retrieval-augmented answering with a verifier) · **Fit:** adaptable · **Problem type:** `grounded-generation`

The `llm-rag` engine implements a neighbouring problem. This use case is `grounded-generation`: the engine supplies reusable parts (data generation with the traps, the evaluation discipline, the tests), and the changes below turn it into this system's starter.

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

- Replace answer-value correctness with the use case's output measure (for example faithfulness, unsupported-statement rate or figure exact match) and a golden set of the documents it must produce
- Keep the verifier that requires the cited passage to support each claim, and extend it to every generated statement rather than a single value
- Add the output template or structure the use case requires, with review before release
- Score "Link correctness" and "Breaking change recall" instead of the kit metrics
- Replace the synthetic data (Documents, versions, passages, questions and citations) with data of the shape this use case has; rename every column and keep the generator's trap tests
- Replace the kit's models with the blueprint's: A drafting pipeline that groups changes by type and audience, writes plain notes with links, runs f…

## Dimension by dimension

| Dimension | This use case needs | The engine provides | Status | Change |
|---|---|---|---|---|
| problem | Grounded text generation: Draft release notes from merged pull requests, issues and labels, grouped for customers and for operators, with links to the sources, for the product owner to approve | Grounded question answering over documents | adapt | The kit implements grounded question answering over documents; this use case is grounded text generation. Only the reusable parts carry over (see the modifications) |
| label | Generated text whose every statement must be supported by source material | Each golden question carries the expected value for the right document version, or none when the documents never state it; correct means the expected value or an abstention | adapt | Define the label this use case really has before writing any code; the kit label does not describe it |
| validation | Golden set of source documents with statement-level support checks and human review | Golden set with unanswerable questions held out by product, and a verifier that checks the cited passage | adapt | Use the validation method named here, not the kit split, which is built for the kit label |
| metrics | Link correctness; Breaking change recall; Editor change rate | Answer accuracy, hallucination on unanswerable questions and abstention rate | adapt | Score "Link correctness" and "Breaking change recall" instead of the kit metrics |
| data | Source documents and reference outputs | A versioned document collection with chunks, source types and intents | adapt | Replace the synthetic data (Documents, versions, passages, questions and citations) with data of the shape this use case has; rename every column and keep the generator's trap tests |
| model | Baseline: Product owners writing notes by hand from a list of merges, because it is the usual approach. Production: A drafting pipeline that groups changes by type and audience, writes plain notes with links, runs filters for… | Hybrid retrieval, a source filter, an intent check and a verifier, with a deterministic stand-in for the language model | adapt | Replace the kit's models with the blueprint's: A drafting pipeline that groups changes by type and audience, writes plain notes with links, runs f… |
| serving | Scheduled batch run | Offline harness only: no document ingestion, vector store, model gateway or answer API | outside-kit | Milestone M5 is yours: nothing in the kit serves traffic |
| integrations | Owner review (editor): a person in the loop; Feedback (monthly) | None. A deterministic stand-in replaces the model; no provider or index is connected | outside-kit | Connect these on your own platform in M5 and M6; the kit connects to nothing |
