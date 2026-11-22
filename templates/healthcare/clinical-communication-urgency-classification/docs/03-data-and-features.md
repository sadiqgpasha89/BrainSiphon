# Clinical Communication Urgency Classification: data and feature specification

> Generated from the blueprint `healthcare/clinical-communication-urgency-classification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Clinical Communication Urgency Classification · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Clinical Communication Urgency Classification": Classify incoming clinical and operational messages by urgency and the response pathway they need, so the right queue sees them first, while deterministic emergency rules and existing escalation protocols stay in force. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on arrival-order labels.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Urgency cue terms and phrases | clinical and operational language that signals urgency in context | Core text signal | Message text |   |   |   |
| Sender role and channel | who sent it and through which channel | Context for urgency | Directory as at send time |   |   |   |
| Recipient context | on-call status and current queue depth | Sets the response pathway | Roster snapshot |   |   |   |
| Thread history | earlier messages in the same conversation | Context for a short message | Earlier messages |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Rules | Deterministic emergency rules above the model | Model-only urgency | A missed emergency keyword is not acceptable |
| Direction | The model may raise urgency but not lower it below the rules | Symmetric adjustment | Under-triage is the dangerous error |
| Threshold | Conservative with an abstain band | Single cut-off | Uncertain messages need a human |
| Taxonomy | Approved urgency categories | Free labels | Pathways depend on agreed categories |
| Visibility | Suggestion shown beside the message | Reordering that hides messages | Nothing may be buried |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Message length | not urgency |
| Sender seniority alone | not clinical urgency |
| Time of day alone | confounded with staffing |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Urgency cue terms and phrases inputs | Clinical operations | Secure messaging platform | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: message text. |
| Sender role and channel inputs | Nursing leadership | Care-team role and on-call directory | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: directory as at send time. |
| Recipient context inputs | Clinical informatics | Urgency taxonomy register | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: roster snapshot. |
| Thread history inputs | Patient safety | Paging and escalation system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: earlier messages. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: clinical_communication_urgency_inputs.v1
owner: clinical-operations@example.com
system_of_record: Secure messaging platform
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: urgency_cue_terms_and_phrases, type: double, nullable: false }
    - { name: sender_role_and_channel, type: double, nullable: false }
    - { name: recipient_context, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Urgency cue terms and phrases and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Sender role and channel against Secure messaging platform
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Urgency cue terms and phrases, traces back to Secure messaging platform; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| MIMIC-IV | https://physionet.org/content/mimiciv/3.1/ | PhysioNet Credentialed Health Data License; credentialing required | De-identified hospital and ICU stays with vitals, labs, medications and procedures | Credentialed access; single centre. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| GoEmotions | https://github.com/google-research/google-research/tree/master/goemotions | Apache 2.0 (see the repository) | 58,000 Reddit comments labelled with 27 emotion categories | Reddit language; label subjectivity. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| PubMedQA | https://pubmedqa.github.io/ | MIT licence (see the repository) | Biomedical research questions with abstracts and yes/no/maybe answers | Research abstracts, not clinical notes. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE clinical_communication_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE clinical_communication_fields (
  document_id TEXT NOT NULL REFERENCES clinical_communication_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE clinical_communication_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Clinical Communication Urgency Classification": Classify incoming clinical and operational messages by urgency and the response pathway they need, so the right queue sees them first, while deterministic emergency rules and existing escalation protocols stay in force. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Clinical data: what the record really contains | The electronic health record holds structured data (vitals, labs, medications, orders, diagnosis codes) and free text (notes, reports). Timestamps differ for ordering, collection and result; documentation is written after the fact; billing codes reflect reimbursement as much as truth; missingness is informative because tests are ordered when clinicians are worried. | Features and labels built from the record encode clinical behaviour, so leakage and bias are the default, not the exception. |
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Hospital operations and capacity | Hospitals schedule operating rooms, staff nurses, forecast emergency demand, manage beds and dispatch ambulances. Demand is lumpy, costs of waiting are asymmetric and safety limits on staffing are hard constraints. | Forecasts and schedules are judged by waiting time, overtime and safety margins, not average error. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Urgency cue terms and phrases | Clinical and operational language that signals urgency in context. Core text signal. | Leakage risk to design against: Message text. |
| A signal-versus-noise trap in this use case: Rules | The true signal is deterministic emergency rules above the model; the common noise is model-only urgency. | A missed emergency keyword is not acceptable. |

**Ask the experts**

- [ ] What exactly does "This is not an emergency triage tool and urgent messages follow the existing escalation protocols whatever the model says" mean in practice for clinical communication urgency classification: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Urgency cue terms and phrases" and "Sender role and channel", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time to first response for urgent messages" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on arrival-order labels, and who can confirm the cut-off times and splits?
- [ ] How often does "Abbreviations and slang" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Triage | Sorting patients by urgency to decide who is seen first. |
| Ordinal triage scale | A graded urgency scale in which being wrong by two levels is worse than by one. |
| Clinical decision support | Software that gives clinicians patient-specific recommendations or alerts at the point of care. |
| Ambient scribe | A system that listens to a visit and drafts the clinical note for the clinician to review. |
| EMS response time | The time from an emergency call to an ambulance arriving, a key service measure. |
| Pathogenic variant | A genetic change that causes or raises the risk of disease. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Macro-F1 | The F1 score averaged over classes, treating rare classes as equally important. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| F1 score | The harmonic mean of precision and recall. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Summarisation | Condensing text while keeping the key facts; evaluated for faithfulness, not just fluency. |
