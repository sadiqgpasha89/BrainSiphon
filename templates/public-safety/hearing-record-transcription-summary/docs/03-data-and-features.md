# Hearing Record Transcription and Summary Assistant: data and feature specification

> Generated from the blueprint `public-safety/hearing-record-transcription-summary` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Hearing Record Transcription and Summary Assistant · **Domain:** public-safety · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Hearing Record Transcription and Summary Assistant": Produce draft transcripts and summaries of recorded hearings for court staff to check, with every summary line linked to the time in the recording. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Treating drafts as official.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| ASR confidence | confidence per segment | Reliability | From ASR |   |   |   |
| Speaker role turns | judge, counsel or witness turns | Navigation | From diarisation by role |   |   |   |
| Legal term lexicon match | recognition of legal terms | Accuracy | From glossaries |   |   |   |
| Audio quality | noise and overlap | Reliability | From audio |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Status | A draft aid | The official record | Certified records have legal weight |
| Evidence | Timestamp links | A free summary | Errors in a summary can mislead |
| Accuracy | Word error rates by speaker and noise | One headline number | Quality varies by courtroom |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Party name | personal data |
| Courtroom name | an identifier |
| File name | an artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| ASR confidence inputs | Emergency communications | Computer-aided dispatch (CAD) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from ASR. |
| Speaker role turns inputs | Operations and investigations leadership | Records management and evidence systems | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from diarisation by role. |
| Legal term lexicon match inputs | Chief data and ethics officer | Court case management | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from glossaries. |
| Audio quality inputs | Emergency communications | Computer-aided dispatch (CAD) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from audio. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: hearing_record_transcription_summary_inputs.v1
owner: emergency-communications@example.com
system_of_record: Computer-aided dispatch (CAD)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: asr_confidence, type: double, nullable: false }
    - { name: speaker_role_turns, type: double, nullable: false }
    - { name: legal_term_lexicon_match, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on ASR confidence and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Speaker role turns against Computer-aided dispatch (CAD)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as ASR confidence, traces back to Computer-aided dispatch (CAD); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** No model produces a risk score for a named individual, no biometric identification is performed, retention is limited and every access to case data is logged for oversight. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| SWE-bench | https://www.swebench.com/ | MIT licence (see the repository) | Real GitHub issues with the pull requests that fixed them and runnable tests | Python repositories only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Enron email dataset | https://www.cs.cmu.edu/~enron/ | Public release (see the page) | About 500,000 emails from 150 users | Old corporate email; legal and privacy sensitivities. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| HumanEval | https://github.com/openai/human-eval | MIT licence (see the repository) | 164 hand-written programming problems with unit tests for evaluating code generation | Small and widely contaminated; use for harness checks. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE hearing_record_transcription_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE hearing_record_transcription_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES hearing_record_transcription_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON hearing_record_transcription_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE hearing_record_transcription_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

Public safety covers emergency calls, dispatch, disaster response, road safety, physical security and the courts. Seconds matter, errors cost lives or liberty, and the data describes people at their worst moments, so systems support trained professionals and are built with strict limits on identification, profiling and secondary use. For this use case, "Hearing Record Transcription and Summary Assistant": Produce draft transcripts and summaries of recorded hearings for court staff to check, with every summary line linked to the time in the recording. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Courts and justice need transparency | Case scheduling, document handling and records support the courts, but decisions about guilt, sentence and bail belong to judges. Tools must be transparent and open to challenge. | A tool that influences a liberty decision needs a legal basis, validation and disclosure to the parties. |
| Records are sensitive and need strict retention | Incident, victim and witness records are among the most sensitive data a state holds. Access is logged, retention limits are enforced and data is shared only as the law allows. | Aggregated and de-identified data should be used for analytics wherever possible. |
| Speech and multimodal text | Speech systems turn audio into text and back, and document systems read scans with OCR and layout models. Errors cascade: a misheard word becomes a wrong field downstream. | Measure the whole pipeline end to end, with the accents, noise and scan quality of the real population. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: ASR confidence | Confidence per segment. Reliability. | Leakage risk to design against: From ASR. |
| A signal-versus-noise trap in this use case: Status | The true signal is a draft aid; the common noise is the official record. | Certified records have legal weight. |

**Ask the experts**

- [ ] What exactly does "The official record remains the certified transcript" mean in practice for hearing record transcription and summary assistant: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "ASR confidence" and "Speaker role turns", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time to a draft" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: treating drafts as official, and who can confirm the cut-off times and splits?
- [ ] How often does "Overlapping speech" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Chain of custody | The record of who handled evidence. |
| E-discovery | Finding and reviewing electronic documents for a case. |
| Case backlog | Cases waiting to be heard or resolved. |
| Docket | A list of cases scheduled for court. |
| Bail | Release of an accused person before trial. |
| Human in the loop | A person reviews or approves the system's output. |
| Summarisation | Condensing text while keeping the key facts; evaluated for faithfulness, not just fluency. |
| Word error rate (WER) | Errors in recognised speech divided by the number of reference words. |
| CTC loss | A loss that aligns a signal such as audio or a line image to its text without frame labels. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| RAG | Retrieval-augmented generation: a model answers using passages retrieved from a document collection. |
| Hallucination | A fluent statement not supported by the sources or by reality. |
| LLM-as-judge | Using a language model to grade outputs, which must itself be calibrated against humans. |
| Faithfulness | Whether an answer is supported by the cited sources. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
