# Medical Coding Automation (ICD-10 / CPT): data and feature specification

> Generated from the blueprint `healthcare/icd-cpt-medical-coding-automation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Medical Coding Automation (ICD-10 / CPT) · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Medical Coding Automation (ICD-10 / CPT)": Assign accurate diagnosis and procedure codes from clinical documentation to speed billing and cut denials, with coder oversight. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Silver labels from past coding errors.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Evidence span match | highlighted text span linked to code | Auditability | Span annotation |   |   |   |
| Code hierarchy consistency | parent-child and exclusion rules | Validity | Code-set version as-of date |   |   |   |
| Documentation completeness flags | missing specificity detected | Denial risk | Rule library |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Evidence | Span-level evidence per code for audit | Document-level predictions | Auditors need the sentence that justifies each code |
| Long tail | Hierarchical code structure and retrieval for rare codes | Flat softmax over all codes | Most codes appear fewer than 10 times |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Billing department code history | leaks previous coding decisions |
| Document length | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Evidence span match inputs | Clinical informatics | Electronic health record (EHR) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: span annotation. |
| Code hierarchy consistency inputs | Hospital data office | Laboratory, radiology and PACS systems | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: code-set version as-of date. |
| Documentation completeness flags inputs | Integration team | Master patient index (MPI) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: rule library. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: icd_cpt_medical_coding_automation_inputs.v1
owner: clinical-informatics@example.com
system_of_record: Electronic health record (EHR)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: evidence_span_match, type: double, nullable: false }
    - { name: code_hierarchy_consistency, type: double, nullable: false }
    - { name: documentation_completeness_flags, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Evidence span match and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Code hierarchy consistency against Electronic health record (EHR)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Evidence span match, traces back to Electronic health record (EHR); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| MIMIC-IV | https://physionet.org/content/mimiciv/3.1/ | PhysioNet Credentialed Health Data License; credentialing required | De-identified hospital and ICU stays with vitals, labs, medications and procedures | Credentialed access; single centre. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| PubMedQA | https://pubmedqa.github.io/ | MIT licence (see the repository) | Biomedical research questions with abstracts and yes/no/maybe answers | Research abstracts, not clinical notes. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| BEIR benchmark | https://github.com/beir-cellar/beir | Per-dataset licences (see the repository) | A heterogeneous benchmark of 18 retrieval datasets for zero-shot evaluation | Academic tasks; domain match varies. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE icd_cpt_medical_coding_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE icd_cpt_medical_coding_fields (
  document_id TEXT NOT NULL REFERENCES icd_cpt_medical_coding_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE icd_cpt_medical_coding_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Medical Coding Automation (ICD-10 / CPT)": Assign accurate diagnosis and procedure codes from clinical documentation to speed billing and cut denials, with coder oversight. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Clinical data: what the record really contains | The electronic health record holds structured data (vitals, labs, medications, orders, diagnosis codes) and free text (notes, reports). Timestamps differ for ordering, collection and result; documentation is written after the fact; billing codes reflect reimbursement as much as truth; missingness is informative because tests are ordered when clinicians are worried. | Features and labels built from the record encode clinical behaviour, so leakage and bias are the default, not the exception. |
| Treatment leaks the label | Clinicians order antibiotics, cultures, fluids and lactate because they already suspect sepsis. Those orders are consequences of suspicion, and patients who are treated early may never reach the textbook definition. | Orders and diagnoses must stay out of the features, and treated patients need careful handling in the label, or you learn clinician behaviour instead of physiology. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Evidence span match | Highlighted text span linked to code. Auditability. | Leakage risk to design against: Span annotation. |
| A signal-versus-noise trap in this use case: Evidence | The true signal is span-level evidence per code for audit; the common noise is document-level predictions. | Auditors need the sentence that justifies each code. |

**Ask the experts**

- [ ] What exactly does "70,000 ICD-10 codes" mean in practice for medical coding automation (icd-10 / cpt): who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Evidence span match" and "Code hierarchy consistency", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "First-pass acceptance rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: silver labels from past coding errors, and who can confirm the cut-off times and splits?
- [ ] How often does "Annual code-set update" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| ICD / CPT | Code sets for diagnoses (ICD) and procedures (CPT) used in billing and reporting. |
| Claim denial | An insurer's refusal to pay a claim, often fixable with correct documentation. |
| HCC | Hierarchical condition category: a risk-adjustment grouping of diagnoses that determines payments. |
| Ambient scribe | A system that listens to a visit and drafts the clinical note for the clinician to review. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| PHI | Protected health information: any health data that can identify a patient. |
| De-identification | Removing or masking identifiers from health data so it can be used for research. |
| Clinical decision support | Software that gives clinicians patient-specific recommendations or alerts at the point of care. |
| EMS response time | The time from an emergency call to an ambulance arriving, a key service measure. |
| Single-cell RNA sequencing | A technique that measures gene activity in individual cells, used to identify cell types. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Macro-F1 | The F1 score averaged over classes, treating rare classes as equally important. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
