# Clinical Text PHI Redaction: data and feature specification

> Generated from the blueprint `healthcare/clinical-text-phi-redaction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Clinical Text PHI Redaction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Clinical Text PHI Redaction": Redact or pseudonymise PHI in clinical notes consistently so notes can be used for research and model training. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluation on synthetic or clean notes.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| NER entity confidence | token-level probabilities | Recall tuning | Calibrated |   |   |   |
| Pattern-matched IDs | regex for MRN, phone | Backstop | Local formats |   |   |   |
| Dictionary hit for names | name lists and clinician rosters | Backstop | Updated lists |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Recall | Recall-weighted NER with rule backstops | Balanced F1 | Missing one MRN violates policy |
| Utility | Consistent date shifting and entity pseudonyms | Replacing with tags | Tags destroy temporal and relational information |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Note length | none |
| Clinician specialty | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| NER entity confidence inputs | Clinical informatics | Electronic health record (EHR) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: calibrated. |
| Pattern-matched IDs inputs | Hospital data office | Laboratory, radiology and PACS systems | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: local formats. |
| Dictionary hit for names inputs | Integration team | Master patient index (MPI) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: updated lists. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: clinical_text_phi_redaction_inputs.v1
owner: clinical-informatics@example.com
system_of_record: Electronic health record (EHR)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: ner_entity_confidence, type: double, nullable: false }
    - { name: pattern_matched_ids, type: double, nullable: false }
    - { name: dictionary_hit_for_names, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on NER entity confidence and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Pattern-matched IDs against Electronic health record (EHR)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as NER entity confidence, traces back to Electronic health record (EHR); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| CoNLL-2003 named entity recognition | https://huggingface.co/datasets/eriktks/conll2003 | Research use (see the page) | Newswire text tagged with person, organisation, location and miscellaneous entities | News text; short entity vocabulary. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| FUNSD form understanding | https://guillaumejaume.github.io/FUNSD/ | Research use (see the page) | 199 scanned forms annotated for entity and relation extraction | Tiny; English forms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE clinical_text_phi_redaction_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE clinical_text_phi_redaction_fields (
  document_id TEXT NOT NULL REFERENCES clinical_text_phi_redaction_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE clinical_text_phi_redaction_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Clinical Text PHI Redaction": Redact or pseudonymise PHI in clinical notes consistently so notes can be used for research and model training. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Clinical data: what the record really contains | The electronic health record holds structured data (vitals, labs, medications, orders, diagnosis codes) and free text (notes, reports). Timestamps differ for ordering, collection and result; documentation is written after the fact; billing codes reflect reimbursement as much as truth; missingness is informative because tests are ordered when clinicians are worried. | Features and labels built from the record encode clinical behaviour, so leakage and bias are the default, not the exception. |
| Regulation, privacy and trust in clinical AI | Clinical software may be regulated as a medical device, patient data is protected by privacy law, models must be validated on the population where they will run, and clinicians need to understand and override outputs. Federated approaches let hospitals learn together without sharing records. | Plan for validation evidence, post-deployment monitoring and de-identification from the first design review. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: NER entity confidence | Token-level probabilities. Recall tuning. | Leakage risk to design against: Calibrated. |
| A signal-versus-noise trap in this use case: Recall | The true signal is recall-weighted NER with rule backstops; the common noise is balanced F1. | Missing one MRN violates policy. |

**Ask the experts**

- [ ] What exactly does "Recall over 99.5%" mean in practice for clinical text phi redaction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "NER entity confidence" and "Pattern-matched IDs", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "PHI leaks found in audits" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: evaluation on synthetic or clean notes, and who can confirm the cut-off times and splits?
- [ ] How often does "Names that are common words (Hope, Rose)" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| PHI | Protected health information: any health data that can identify a patient. |
| De-identification | Removing or masking identifiers from health data so it can be used for research. |
| Ambient scribe | A system that listens to a visit and drafts the clinical note for the clinician to review. |
| Clinical decision support | Software that gives clinicians patient-specific recommendations or alerts at the point of care. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Named-entity recognition (NER) | Finding and labelling names of people, organisations, places and other entities in text. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Layout analysis | Finding the structure of a page: columns, tables, headings and fields. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Distribution shift | A change in the data a model sees compared with training. |
| Bootstrap confidence interval | An uncertainty range for a metric obtained by resampling the evaluation data. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Shadow mode | Running a new model on live traffic without acting on its output, to compare it with the current system. |
| Canary release | Exposing a new model to a small share of traffic first, with automatic rollback on guardrail metrics. |
