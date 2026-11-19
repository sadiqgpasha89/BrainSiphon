# Prior Authorization Automation: data and feature specification

> Generated from the blueprint `healthcare/prior-authorization-automation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Prior Authorization Automation · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Prior Authorization Automation": Assemble clinical evidence against payer policies to auto-approve straightforward prior authorisation requests and speed up the rest. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on historical approvals biased by prior reviewers.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Criteria coverage | share of policy criteria with chart evidence | Decision basis | Evidence retrieval accuracy |   |   |   |
| Policy version match | policy in force at request date | Correctness | Effective-date lookup |   |   |   |
| Approval confidence | calibrated probability criteria met | Routing | Calibrated per payer |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Policy | Policy criteria as structured checklists with citations | Generic reasoning from memory | Policies are specific; guesses create wrongful denials |
| Denials | Only humans may deny | Auto-denial | Automated denial raises regulatory and ethical issues |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Physician specialty prestige | none |
| Request channel | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Criteria coverage inputs | Clinical informatics | Electronic health record (EHR) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: evidence retrieval accuracy. |
| Policy version match inputs | Hospital data office | Laboratory, radiology and PACS systems | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: effective-date lookup. |
| Approval confidence inputs | Integration team | Master patient index (MPI) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: calibrated per payer. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: prior_authorization_automation_inputs.v1
owner: clinical-informatics@example.com
system_of_record: Electronic health record (EHR)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: criteria_coverage, type: double, nullable: false }
    - { name: policy_version_match, type: double, nullable: false }
    - { name: approval_confidence, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Criteria coverage and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Policy version match against Electronic health record (EHR)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Criteria coverage, traces back to Electronic health record (EHR); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| PubMedQA | https://pubmedqa.github.io/ | MIT licence (see the repository) | Biomedical research questions with abstracts and yes/no/maybe answers | Research abstracts, not clinical notes. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| BEIR benchmark | https://github.com/beir-cellar/beir | Per-dataset licences (see the repository) | A heterogeneous benchmark of 18 retrieval datasets for zero-shot evaluation | Academic tasks; domain match varies. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE prior_authorization_automation_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE prior_authorization_automation_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES prior_authorization_automation_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON prior_authorization_automation_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE prior_authorization_automation_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Prior Authorization Automation": Assemble clinical evidence against payer policies to auto-approve straightforward prior authorisation requests and speed up the rest. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Patient-facing language models and safety | Chatbots, symptom checkers and message triage talk to people in distress. Errors range from unhelpful to dangerous, so systems need escalation rules, clinician oversight and strict limits on what they may advise. | Safety evaluation is a red-team exercise with adversarial and crisis scenarios, not a fluency score. |
| Chart time, draw time and result time | A lab has an order time, a collection (draw) time and a result time, often an hour or more apart; vitals have a measurement time and a charting time. A feature may use a value only once clinicians could have seen it. | Using draw time instead of result time gives the model information the ward never had, so offline lead time looks better than real life. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Speech and multimodal text | Speech systems turn audio into text and back, and document systems read scans with OCR and layout models. Errors cascade: a misheard word becomes a wrong field downstream. | Measure the whole pipeline end to end, with the accents, noise and scan quality of the real population. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Criteria coverage | Share of policy criteria with chart evidence. Decision basis. | Leakage risk to design against: Evidence retrieval accuracy. |
| A signal-versus-noise trap in this use case: Policy | The true signal is policy criteria as structured checklists with citations; the common noise is generic reasoning from memory. | Policies are specific; guesses create wrongful denials. |

**Ask the experts**

- [ ] What exactly does "Payer policy versions change monthly" mean in practice for prior authorization automation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Criteria coverage" and "Policy version match", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Auto-approval rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on historical approvals biased by prior reviewers, and who can confirm the cut-off times and splits?
- [ ] How often does "Policy PDF format changes" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Clinical decision support | Software that gives clinicians patient-specific recommendations or alerts at the point of care. |
| Ambient scribe | A system that listens to a visit and drafts the clinical note for the clinician to review. |
| FHIR / HL7 | Standards for exchanging health data between systems; the alert pipeline typically consumes FHIR or HL7 messages. |
| Alert burden | How many alerts clinicians receive per unit of care, which has to stay low enough that they keep responding. |
| ICD / CPT | Code sets for diagnoses (ICD) and procedures (CPT) used in billing and reporting. |
| Claim denial | An insurer's refusal to pay a claim, often fixable with correct documentation. |
| Nurse staffing ratio | The number of patients per nurse permitted on a unit, often set by policy or law. |
| Eligibility criteria | The rules that determine whether a patient may join a clinical trial. |
| Chunking | Splitting documents into pieces for indexing and retrieval. |
| RAG | Retrieval-augmented generation: a model answers using passages retrieved from a document collection. |
| Hallucination | A fluent statement not supported by the sources or by reality. |
| Faithfulness | Whether an answer is supported by the cited sources. |
| Layout analysis | Finding the structure of a page: columns, tables, headings and fields. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| OCR | Optical character recognition: reading printed or handwritten text from images. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Approval gate | A required human sign-off before an agent performs a consequential action. |
