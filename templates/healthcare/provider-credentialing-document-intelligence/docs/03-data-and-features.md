# Provider Credentialing Document Intelligence: data and feature specification

> Generated from the blueprint `healthcare/provider-credentialing-document-intelligence` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Provider Credentialing Document Intelligence · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Provider Credentialing Document Intelligence": Ingest provider applications and supporting evidence, classify each document, extract fields with page-level provenance, validate completeness and reconcile values across sources so credentialing staff review a ready evidence packet instead of raw paperwork. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Splitting train and test by page and not by provider.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Field confidence | calibrated extraction confidence per field and document | Directs review effort to uncertain fields | Calibrate on held-out document groups |   |   |   |
| Document-type completeness | required documents present for the credential type | Core completeness signal | Requirements as of the application date |   |   |   |
| Cross-source agreement | match score between application, licence and verification response | Detects mismatches | Compare against verification responses received before scoring |   |   |   |
| Expiry window | days between document expiry and decision date | Expired evidence is unusable | Use document dates not upload dates |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Provenance | Field value with source page, region and confidence | Extracted value with no source | A reviewer cannot trust or correct an unsourced field |
| Verification | Primary-source verification result is the authority | Extracted value treated as verified | An extracted licence number is a claim until a source confirms it |
| Completeness | Deterministic checklist per credential type and jurisdiction | A model guess at completeness | Missing items must be explicit and auditable |
| Discrepancy | Cross-source mismatch queue for staff | Silent choice of one value | Name or date mismatches are the highest-risk records |
| Scope | Evidence packet and summary | Approval recommendation | Approval is a human committee decision |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Provider prestige or institution ranking | irrelevant to evidence completeness and a bias risk |
| Document layout aesthetics | rarely related to validity |
| Applicant nationality or name origin | protected and irrelevant |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Field confidence inputs | Medical staff office | Credentialing and privileging system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: calibrate on held-out document groups. |
| Document-type completeness inputs | Credentialing verification organisation | Provider master data | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: requirements as of the application date. |
| Cross-source agreement inputs | Provider data governance | Primary-source verification services | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: compare against verification responses received before scoring. |
| Expiry window inputs | Privacy office | Document repository | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use document dates not upload dates. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: provider_credentialing_document_inputs.v1
owner: medical-staff-office@example.com
system_of_record: Credentialing and privileging system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: field_confidence, type: double, nullable: false }
    - { name: document_type_completeness, type: double, nullable: false }
    - { name: cross_source_agreement, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Field confidence and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Document-type completeness against Credentialing and privileging system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Field confidence, traces back to Credentialing and privileging system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| FUNSD form understanding | https://guillaumejaume.github.io/FUNSD/ | Research use (see the page) | 199 scanned forms annotated for entity and relation extraction | Tiny; English forms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CoNLL-2003 named entity recognition | https://huggingface.co/datasets/eriktks/conll2003 | Research use (see the page) | Newswire text tagged with person, organisation, location and miscellaneous entities | News text; short entity vocabulary. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE provider_credentialing_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE provider_credentialing_fields (
  document_id TEXT NOT NULL REFERENCES provider_credentialing_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE provider_credentialing_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Provider Credentialing Document Intelligence": Ingest provider applications and supporting evidence, classify each document, extract fields with page-level provenance, validate completeness and reconcile values across sources so credentialing staff review a ready evidence packet instead of raw paperwork. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Chart time, draw time and result time | A lab has an order time, a collection (draw) time and a result time, often an hour or more apart; vitals have a measurement time and a charting time. A feature may use a value only once clinicians could have seen it. | Using draw time instead of result time gives the model information the ward never had, so offline lead time looks better than real life. |
| Alert fatigue and the response workflow | Nurses and physicians see many alerts per shift. Alerts that fire too often are ignored or disabled, and an alert is only useful if a named person knows what to do within a set time. Hospital quality programmes, such as the SEP-1 bundle in the United States, define the care steps that should follow suspected sepsis. | The right metric is sensitivity and lead time at an agreed alert burden, agreed with ward leadership before modelling. |
| Speech and multimodal text | Speech systems turn audio into text and back, and document systems read scans with OCR and layout models. Errors cascade: a misheard word becomes a wrong field downstream. | Measure the whole pipeline end to end, with the accents, noise and scan quality of the real population. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Field confidence | Calibrated extraction confidence per field and document. Directs review effort to uncertain fields. | Leakage risk to design against: Calibrate on held-out document groups. |
| A signal-versus-noise trap in this use case: Provenance | The true signal is field value with source page, region and confidence; the common noise is extracted value with no source. | A reviewer cannot trust or correct an unsourced field. |

**Ask the experts**

- [ ] What exactly does "Every extracted fact links to its source page, region and extraction confidence" mean in practice for provider credentialing document intelligence: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Field confidence" and "Document-type completeness", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Specialist handling time per file" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: splitting train and test by page and not by provider, and who can confirm the cut-off times and splits?
- [ ] How often does "Low-quality scan" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Nurse staffing ratio | The number of patients per nurse permitted on a unit, often set by policy or law. |
| EMS response time | The time from an emergency call to an ambulance arriving, a key service measure. |
| Pathogenic variant | A genetic change that causes or raises the risk of disease. |
| Layout analysis | Finding the structure of a page: columns, tables, headings and fields. |
| OCR | Optical character recognition: reading printed or handwritten text from images. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| F1 score | The harmonic mean of precision and recall. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Fairness metrics | Measures of whether a model's errors or outcomes differ between groups, such as demographic parity or equalised odds. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Macro-F1 | The F1 score averaged over classes, treating rare classes as equally important. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
