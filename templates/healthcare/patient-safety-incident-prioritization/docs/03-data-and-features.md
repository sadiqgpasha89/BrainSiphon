# Patient Safety Incident Prioritization: data and feature specification

> Generated from the blueprint `healthcare/patient-safety-incident-prioritization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Patient Safety Incident Prioritization · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Patient Safety Incident Prioritization": Triage patient-safety incident reports by potential severity, urgency, recurrence and required review pathway, so safety professionals open the highest-risk reports first and mandatory escalations are never delayed. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on reporter-assigned severity.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Narrative risk phrases | model-extracted harm, equipment, medication and escalation cues | Narrative contains severity signals fields miss | Redacted text as at report time |   |   |   |
| Event type and location risk | event category with unit risk profile | Context changes potential severity | Taxonomy version |   |   |   |
| Recurrence | similar event count in the same unit or process in the last 90 days | Repeated events signal a system issue | Count only earlier events |   |   |   |
| Report completeness | share of required fields filled | Poor reports need follow-up | At submission |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Escalation | Hard rules for sentinel events and reportable categories | A learned threshold | A missed sentinel event is unacceptable |
| Severity | Potential severity and actual harm as separate fields | One severity number | Near misses can carry high potential harm |
| Labels | Severity after safety review | Initial reporter severity | Reporters under- and over-state |
| Missing info | Prompts for missing facts | Silent guess | An incomplete report needs a question not a score |
| Fairness | Parity across units and reporter roles | Aggregate accuracy | Under-triage of some groups hides real risk |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Reporter name or role seniority | bias source and unrelated to severity |
| Report length | style rather than risk |
| Submission time of day | process artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Narrative risk phrases inputs | Patient safety office | Incident reporting system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: redacted text as at report time. |
| Event type and location risk inputs | Risk management | Patient safety event taxonomy | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: taxonomy version. |
| Recurrence inputs | Quality | Risk management case system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: count only earlier events. |
| Report completeness inputs | Clinical informatics | Incident reporting system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: at submission. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: patient_safety_incident_prioritization_inputs.v1
owner: patient-safety-office@example.com
system_of_record: Incident reporting system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: narrative_risk_phrases, type: double, nullable: false }
    - { name: event_type_and_location_risk, type: double, nullable: false }
    - { name: recurrence, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Narrative risk phrases and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Event type and location risk against Incident reporting system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Narrative risk phrases, traces back to Incident reporting system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| MIMIC-IV | https://physionet.org/content/mimiciv/3.1/ | PhysioNet Credentialed Health Data License; credentialing required | De-identified hospital and ICU stays with vitals, labs, medications and procedures | Credentialed access; single centre. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| NVD vulnerability data feeds | https://nvd.nist.gov/vuln/data-feeds | Public US government data | All published CVEs with descriptions, severity scores and affected products | Severity is not exploitation; label exploitation from another source. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| PubMedQA | https://pubmedqa.github.io/ | MIT licence (see the repository) | Biomedical research questions with abstracts and yes/no/maybe answers | Research abstracts, not clinical notes. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE patient_safety_incident_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE patient_safety_incident_fields (
  document_id TEXT NOT NULL REFERENCES patient_safety_incident_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE patient_safety_incident_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Patient Safety Incident Prioritization": Triage patient-safety incident reports by potential severity, urgency, recurrence and required review pathway, so safety professionals open the highest-risk reports first and mandatory escalations are never delayed. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Patient-facing language models and safety | Chatbots, symptom checkers and message triage talk to people in distress. Errors range from unhelpful to dangerous, so systems need escalation rules, clinician oversight and strict limits on what they may advise. | Safety evaluation is a red-team exercise with adversarial and crisis scenarios, not a fluency score. |
| Clinical data: what the record really contains | The electronic health record holds structured data (vitals, labs, medications, orders, diagnosis codes) and free text (notes, reports). Timestamps differ for ordering, collection and result; documentation is written after the fact; billing codes reflect reimbursement as much as truth; missingness is informative because tests are ordered when clinicians are worried. | Features and labels built from the record encode clinical behaviour, so leakage and bias are the default, not the exception. |
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Narrative risk phrases | Model-extracted harm, equipment, medication and escalation cues. Narrative contains severity signals fields miss. | Leakage risk to design against: Redacted text as at report time. |
| A signal-versus-noise trap in this use case: Escalation | The true signal is hard rules for sentinel events and reportable categories; the common noise is a learned threshold. | A missed sentinel event is unacceptable. |

**Ask the experts**

- [ ] What exactly does "Deterministic escalation rules for sentinel and never events run first and always override the model" mean in practice for patient safety incident prioritization: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Narrative risk phrases" and "Event type and location risk", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time from report to first review for high-severity events" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on reporter-assigned severity, and who can confirm the cut-off times and splits?
- [ ] How often does "New event type not in the taxonomy" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Adverse drug event | Harm caused by a medicine, including interactions between drugs. |
| Mental health crisis | A situation, such as suicidal intent, that needs immediate human escalation rather than automated advice. |
| Patient-day | One patient present for one day, the denominator for alert burden such as alerts per 100 patient-days. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| PHI | Protected health information: any health data that can identify a patient. |
| De-identification | Removing or masking identifiers from health data so it can be used for research. |
| Cohort | A defined group of patients used for a study or for matching to trials. |
| Macro-F1 | The F1 score averaged over classes, treating rare classes as equally important. |
| Near-duplicate | A text that is almost identical to another, such as a forwarded email, which leaks across random splits. |
| Toxicity classification | Detecting abusive, hateful or harassing language. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| F1 score | The harmonic mean of precision and recall. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Fairness metrics | Measures of whether a model's errors or outcomes differ between groups, such as demographic parity or equalised odds. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Summarisation | Condensing text while keeping the key facts; evaluated for faithfulness, not just fluency. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
