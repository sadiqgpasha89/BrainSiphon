# Healthcare Contract Clause Risk Classification: data and feature specification

> Generated from the blueprint `healthcare/healthcare-contract-clause-risk-classification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Contract Clause Risk Classification · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Healthcare Contract Clause Risk Classification": Identify clauses that deviate from approved playbooks or create legal, financial, privacy, security, operational or clinical-continuity risk, and rank them for counsel review with source spans and the deviation from the fallback language. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Splitting by clause not by contract.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Playbook deviation score | semantic and structural distance from approved clause language | Primary risk signal | Playbook version |   |   |   |
| Clause type and obligation direction | classified clause family and who carries the obligation | Risk depends on who bears it | Parsed text |   |   |   |
| Liability and indemnity terms | caps, exclusions and indemnity scope as extracted values | Financial exposure | Extracted with provenance |   |   |   |
| Data-handling terms | data location, breach notice and subprocessor rights | Privacy and security risk | Extracted with provenance |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Playbook | Deviation from approved language | Free-form risk opinion | Counsel needs the rule and the fallback |
| Source | Clause span with section references | Summary only | A flag without a source cannot be reviewed |
| Risk type | Separate legal, financial, privacy and continuity types | One risk label | Different owners handle different risks |
| Determination | Counsel decides | Model verdict | Legal advice cannot be automated |
| Context | Contract type and jurisdiction | Clause in isolation | The same clause is acceptable in one context and not another |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Contract length | not risk |
| Counterparty brand | not clause risk |
| Formatting and numbering style | layout |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Playbook deviation score inputs | Legal | Contract management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: playbook version. |
| Clause type and obligation direction inputs | Procurement | Clause library and legal playbook | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: parsed text. |
| Liability and indemnity terms inputs | Privacy and security | Document repository | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: extracted with provenance. |
| Data-handling terms inputs | Compliance | Contract metadata | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: extracted with provenance. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: healthcare_contract_clause_risk_inputs.v1
owner: legal@example.com
system_of_record: Contract management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: playbook_deviation_score, type: double, nullable: false }
    - { name: clause_type_and_obligation_direction, type: double, nullable: false }
    - { name: liability_and_indemnity_terms, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Playbook deviation score and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Clause type and obligation direction against Contract management system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Playbook deviation score, traces back to Contract management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| FUNSD form understanding | https://guillaumejaume.github.io/FUNSD/ | Research use (see the page) | 199 scanned forms annotated for entity and relation extraction | Tiny; English forms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| BEIR benchmark | https://github.com/beir-cellar/beir | Per-dataset licences (see the repository) | A heterogeneous benchmark of 18 retrieval datasets for zero-shot evaluation | Academic tasks; domain match varies. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE healthcare_contract_clause_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE healthcare_contract_clause_fields (
  document_id TEXT NOT NULL REFERENCES healthcare_contract_clause_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE healthcare_contract_clause_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Healthcare Contract Clause Risk Classification": Identify clauses that deviate from approved playbooks or create legal, financial, privacy, security, operational or clinical-continuity risk, and rank them for counsel review with source spans and the deviation from the fallback language. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Treatment leaks the label | Clinicians order antibiotics, cultures, fluids and lactate because they already suspect sepsis. Those orders are consequences of suspicion, and patients who are treated early may never reach the textbook definition. | Orders and diagnoses must stay out of the features, and treated patients need careful handling in the label, or you learn clinician behaviour instead of physiology. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Playbook deviation score | Semantic and structural distance from approved clause language. Primary risk signal. | Leakage risk to design against: Playbook version. |
| A signal-versus-noise trap in this use case: Playbook | The true signal is deviation from approved language; the common noise is free-form risk opinion. | Counsel needs the rule and the fallback. |

**Ask the experts**

- [ ] What exactly does "Legal counsel makes legal determinations and approves changes and the classifier only flags and ranks" mean in practice for healthcare contract clause risk classification: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Playbook deviation score" and "Clause type and obligation direction", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Counsel review time per agreement" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: splitting by clause not by contract, and who can confirm the cut-off times and splits?
- [ ] How often does "Scanned contract with poor text" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Pathogenic variant | A genetic change that causes or raises the risk of disease. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Segmentation | Outlining the exact pixels of an organ, tumour or structure in an image. |
| PHI | Protected health information: any health data that can identify a patient. |
| De-identification | Removing or masking identifiers from health data so it can be used for research. |
| Federated learning | Training a shared model across institutions without moving their data. |
| Clinical decision support | Software that gives clinicians patient-specific recommendations or alerts at the point of care. |
| Ambient scribe | A system that listens to a visit and drafts the clinical note for the clinician to review. |
| OR block time | Reserved operating room time given to surgeons or services. |
| Length of stay | How long a patient is admitted, a main driver of bed demand and cost. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Macro-F1 | The F1 score averaged over classes, treating rare classes as equally important. |
| Layout analysis | Finding the structure of a page: columns, tables, headings and fields. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| F1 score | The harmonic mean of precision and recall. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Degradation ladder | An ordered list of fallbacks the service uses as dependencies fail. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
