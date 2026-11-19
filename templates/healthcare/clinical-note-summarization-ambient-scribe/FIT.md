# Ambient Clinical Scribe & Note Summarisation: how well the starter fits

> Generated from the blueprint `healthcare/clinical-note-summarization-ambient-scribe` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

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
- Score "Unsupported-statement rate" and "Medical entity F1" instead of the kit metrics
- Replace the synthetic data (Documents, versions, passages, questions and citations) with data of the shape this use case has; rename every column and keep the generator's trap tests
- Replace the kit's models with the blueprint's: Streaming medical ASR with diarisation, chunked summarisation with span grounding, structured EHR f…

## Dimension by dimension

| Dimension | This use case needs | The engine provides | Status | Change |
|---|---|---|---|---|
| problem | Grounded text generation: Transcribe clinic visits and draft SOAP notes and patient instructions for clinician review, returning hours to clinicians each week | Grounded question answering over documents | adapt | The kit implements grounded question answering over documents; this use case is grounded text generation. Only the reusable parts carry over (see the modifications) |
| label | Generated text whose every statement must be supported by source material | Each golden question carries the expected value for the right document version, or none when the documents never state it; correct means the expected value or an abstention | adapt | Define the label this use case really has before writing any code; the kit label does not describe it |
| validation | Golden set of source documents with statement-level support checks and human review | Golden set with unanswerable questions held out by product, and a verifier that checks the cited passage | adapt | Use the validation method named here, not the kit split, which is built for the kit label |
| metrics | Unsupported-statement rate; Medical entity F1 | Answer accuracy, hallucination on unanswerable questions and abstention rate | adapt | Score "Unsupported-statement rate" and "Medical entity F1" instead of the kit metrics |
| data | Source documents and reference outputs | A versioned document collection with chunks, source types and intents | adapt | Replace the synthetic data (Documents, versions, passages, questions and citations) with data of the shape this use case has; rename every column and keep the generator's trap tests |
| model | Baseline: Clinician dictation and templates. Production: Streaming medical ASR with diarisation, chunked summarisation with span grounding, structured EHR field extra… | Hybrid retrieval, a source filter, an intent check and a verifier, with a deterministic stand-in for the language model | adapt | Replace the kit's models with the blueprint's: Streaming medical ASR with diarisation, chunked summarisation with span grounding, structured EHR f… |
| serving | Interactive response in seconds (p99 2500 ms) | Offline harness only: no document ingestion, vector store, model gateway or answer API | outside-kit | Milestone M5 is yours: nothing in the kit serves traffic |
| integrations | Audio capture (exam-room device); Clinician review (EHR editor): a person in the loop; EHR writer (FHIR API); Edit feedback (evaluation set) | None. A deterministic stand-in replaces the model; no provider or index is connected | outside-kit | Connect these on your own platform in M5 and M6; the kit connects to nothing |
