# Regulatory Quality Measure Gap Detection: data and feature specification

> Generated from the blueprint `healthcare/regulatory-quality-measure-gap-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Regulatory Quality Measure Gap Detection · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Regulatory Quality Measure Gap Detection": Identify missing documentation, measure evidence, workflow steps and data fields needed to satisfy selected quality requirements, with a requirement-to-evidence map that cites its sources and rule versions. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Scoring answers without checking citations.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Evidence coverage | share of requirement elements with a cited evidence span | Core gap measure | Retrieved from approved sources |   |   |   |
| Evidence freshness | age of the evidence relative to the required period | Stale evidence fails the requirement | Document dates |   |   |   |
| Citation precision | share of cited spans that actually support the claim | Quality of the retrieval | Judged on a labelled set |   |   |   |
| Owner responsiveness | days from gap assignment to closure in prior cycles | Prioritises follow-up | Past cycles only |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Mapping | Requirement to evidence map with citations | Free-text answer that a requirement is met | A claim without evidence will not survive an audit |
| Rules | Deterministic checks for required fields and dates | LLM judgement for every gap | Rules are cheaper and exact |
| Applicability | Owner confirms whether a requirement applies | Assumed applicability | A requirement for a service not offered is a false gap |
| Abstention | Insufficient evidence is a result | Best guess | Guesses create false assurance |
| Version | Requirement version at the date in scope | Latest text | Audits judge against the version in force |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Document length | not evidence quality |
| Author seniority | not evidence quality |
| Query phrasing | model sensitivity |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Evidence coverage inputs | Quality and accreditation | Quality and performance reporting system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: retrieved from approved sources. |
| Evidence freshness inputs | Compliance | Policy and document repository | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: document dates. |
| Citation precision inputs | Clinical informatics | Evidence repository | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: judged on a labelled set. |
| Owner responsiveness inputs | Policy owners | Measure specification library | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: past cycles only. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: regulatory_quality_measure_gap_detection_inputs.v1
owner: quality-and-accreditation@example.com
system_of_record: Quality and performance reporting system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: evidence_coverage, type: double, nullable: false }
    - { name: evidence_freshness, type: double, nullable: false }
    - { name: citation_precision, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Evidence coverage and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Evidence freshness against Quality and performance reporting system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Evidence coverage, traces back to Quality and performance reporting system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MS MARCO | https://microsoft.github.io/msmarco/ | Non-commercial research use (see the page) | Large-scale passage and document ranking data from real search queries | Web search, not enterprise or docs. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| PubMedQA | https://pubmedqa.github.io/ | MIT licence (see the repository) | Biomedical research questions with abstracts and yes/no/maybe answers | Research abstracts, not clinical notes. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE regulatory_quality_measure_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE regulatory_quality_measure_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES regulatory_quality_measure_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON regulatory_quality_measure_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE regulatory_quality_measure_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Regulatory Quality Measure Gap Detection": Identify missing documentation, measure evidence, workflow steps and data fields needed to satisfy selected quality requirements, with a requirement-to-evidence map that cites its sources and rule versions. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Regulation, privacy and trust in clinical AI | Clinical software may be regulated as a medical device, patient data is protected by privacy law, models must be validated on the population where they will run, and clinicians need to understand and override outputs. Federated approaches let hospitals learn together without sharing records. | Plan for validation evidence, post-deployment monitoring and de-identification from the first design review. |
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Speech and multimodal text | Speech systems turn audio into text and back, and document systems read scans with OCR and layout models. Errors cascade: a misheard word becomes a wrong field downstream. | Measure the whole pipeline end to end, with the accents, noise and scan quality of the real population. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Evidence coverage | Share of requirement elements with a cited evidence span. Core gap measure. | Leakage risk to design against: Retrieved from approved sources. |
| A signal-versus-noise trap in this use case: Mapping | The true signal is requirement to evidence map with citations; the common noise is free-text answer that a requirement is met. | A claim without evidence will not survive an audit. |

**Ask the experts**

- [ ] What exactly does "Every claim cites the source document and the rule version" mean in practice for regulatory quality measure gap detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Evidence coverage" and "Evidence freshness", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Gaps closed before the audit date" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: scoring answers without checking citations, and who can confirm the cut-off times and splits?
- [ ] How often does "Evidence exists in a scanned file" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Ambient scribe | A system that listens to a visit and drafts the clinical note for the clinician to review. |
| Audit trail | A tamper-evident record of what the system saw, decided and did. |
| RAG | Retrieval-augmented generation: a model answers using passages retrieved from a document collection. |
| LLM-as-judge | Using a language model to grade outputs, which must itself be calibrated against humans. |
| Chunking | Splitting documents into pieces for indexing and retrieval. |
| Layout analysis | Finding the structure of a page: columns, tables, headings and fields. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| OCR | Optical character recognition: reading printed or handwritten text from images. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| A/B test | A randomised experiment comparing two versions on a business metric. |
| Abstention | Declining to answer because the evidence is missing. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Summarisation | Condensing text while keeping the key facts; evaluated for faithfulness, not just fluency. |
