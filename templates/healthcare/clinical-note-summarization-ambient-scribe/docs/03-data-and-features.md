# Ambient Clinical Scribe & Note Summarisation: data and feature specification

> Generated from the blueprint `healthcare/clinical-note-summarization-ambient-scribe` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Ambient Clinical Scribe & Note Summarisation · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Ambient Clinical Scribe & Note Summarisation": Transcribe clinic visits and draft SOAP notes and patient instructions for clinician review, returning hours to clinicians each week. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Judging notes by fluency.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Span-level support | fraction of note statements linked to transcript | Faithfulness | Alignment algorithm |   |   |   |
| Medical entity accuracy | drug names and doses correct | Safety | Formulary dictionary |   |   |   |
| Clinician edit ratio | edits per note section | Utility | Excludes formatting edits |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Faithfulness | Every statement traceable to transcript spans | Fluent plausible notes | Unsupported statements enter the legal record |
| Diarisation | Speaker roles (clinician, patient, family) | Single transcript stream | Misattributed symptoms are wrong history |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Small talk | not clinical |
| Note verbosity | burden |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Span-level support inputs | Clinical informatics | Electronic health record (EHR) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: alignment algorithm. |
| Medical entity accuracy inputs | Hospital data office | Laboratory, radiology and PACS systems | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: formulary dictionary. |
| Clinician edit ratio inputs | Integration team | Master patient index (MPI) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: excludes formatting edits. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: clinical_note_summarization_ambient_inputs.v1
owner: clinical-informatics@example.com
system_of_record: Electronic health record (EHR)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: span_level_support, type: double, nullable: false }
    - { name: medical_entity_accuracy, type: double, nullable: false }
    - { name: clinician_edit_ratio, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Span-level support and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Medical entity accuracy against Electronic health record (EHR)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Span-level support, traces back to Electronic health record (EHR); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| PubMedQA | https://pubmedqa.github.io/ | MIT licence (see the repository) | Biomedical research questions with abstracts and yes/no/maybe answers | Research abstracts, not clinical notes. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| HumanEval | https://github.com/openai/human-eval | MIT licence (see the repository) | 164 hand-written programming problems with unit tests for evaluating code generation | Small and widely contaminated; use for harness checks. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE clinical_note_summarization_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE clinical_note_summarization_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES clinical_note_summarization_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON clinical_note_summarization_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE clinical_note_summarization_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Ambient Clinical Scribe & Note Summarisation": Transcribe clinic visits and draft SOAP notes and patient instructions for clinician review, returning hours to clinicians each week. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Clinical data: what the record really contains | The electronic health record holds structured data (vitals, labs, medications, orders, diagnosis codes) and free text (notes, reports). Timestamps differ for ordering, collection and result; documentation is written after the fact; billing codes reflect reimbursement as much as truth; missingness is informative because tests are ordered when clinicians are worried. | Features and labels built from the record encode clinical behaviour, so leakage and bias are the default, not the exception. |
| Patient-facing language models and safety | Chatbots, symptom checkers and message triage talk to people in distress. Errors range from unhelpful to dangerous, so systems need escalation rules, clinician oversight and strict limits on what they may advise. | Safety evaluation is a red-team exercise with adversarial and crisis scenarios, not a fluency score. |
| Evaluating language-model systems | Evaluation uses a held-out golden set that includes adversarial, unanswerable and edge cases, automatic checks (does the code run, does the number match the source), calibrated model judges and human review. Prompts and models change often, so evaluation runs as regression tests. | Cases used to tune prompts cannot be used to report quality; keep a frozen test set and add every production failure to the tuning set. |
| Speech and multimodal text | Speech systems turn audio into text and back, and document systems read scans with OCR and layout models. Errors cascade: a misheard word becomes a wrong field downstream. | Measure the whole pipeline end to end, with the accents, noise and scan quality of the real population. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Span-level support | Fraction of note statements linked to transcript. Faithfulness. | Leakage risk to design against: Alignment algorithm. |
| A signal-versus-noise trap in this use case: Faithfulness | The true signal is every statement traceable to transcript spans; the common noise is fluent plausible notes. | Unsupported statements enter the legal record. |

**Ask the experts**

- [ ] What exactly does "Patient consent recorded" mean in practice for ambient clinical scribe & note summarisation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Span-level support" and "Medical entity accuracy", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Documentation time per visit" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: judging notes by fluency, and who can confirm the cut-off times and splits?
- [ ] How often does "Multilingual visit with interpreter" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Ambient scribe | A system that listens to a visit and drafts the clinical note for the clinician to review. |
| PHI | Protected health information: any health data that can identify a patient. |
| De-identification | Removing or masking identifiers from health data so it can be used for research. |
| Clinical decision support | Software that gives clinicians patient-specific recommendations or alerts at the point of care. |
| Adverse drug event | Harm caused by a medicine, including interactions between drugs. |
| Faithfulness | Whether an answer is supported by the cited sources. |
| Abstention | Declining to answer because the evidence is missing. |
| LLM-as-judge | Using a language model to grade outputs, which must itself be calibrated against humans. |
| Structured output | Constraining a model to produce valid JSON or SQL against a schema. |
| Summarisation | Condensing text while keeping the key facts; evaluated for faithfulness, not just fluency. |
| Named-entity recognition (NER) | Finding and labelling names of people, organisations, places and other entities in text. |
| Layout analysis | Finding the structure of a page: columns, tables, headings and fields. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Bootstrap confidence interval | An uncertainty range for a metric obtained by resampling the evaluation data. |
| Macro-F1 | The F1 score averaged over classes, treating rare classes as equally important. |
| OCR | Optical character recognition: reading printed or handwritten text from images. |
