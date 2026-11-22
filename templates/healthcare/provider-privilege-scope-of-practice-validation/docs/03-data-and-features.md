# Provider Privilege & Scope-of-Practice Validation: data and feature specification

> Generated from the blueprint `healthcare/provider-privilege-scope-of-practice-validation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Provider Privilege & Scope-of-Practice Validation · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Provider Privilege & Scope-of-Practice Validation": Detect mismatches between provider qualifications, granted privileges, specialty, facility rules and proposed assignments or procedures, and give the medical staff office an auditable explanation of each exception. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Letting the ranker decide eligibility.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Privilege coverage | procedure code mapped to required privilege vs granted privilege | The core eligibility test | Catalogue version at the assignment date |   |   |   |
| Credential validity at date | licence and certification validity on the assignment date | Expired evidence invalidates eligibility | Use effective dates |   |   |   |
| Supervision requirement | required supervisor and availability | Some privileges are conditional | Rules as published |   |   |   |
| Exception novelty | whether this mismatch pattern was seen and cleared before | Reduces repeated review | Past adjudicated exceptions only |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Authority | Deterministic rules from bylaws and policy | A learned authorisation score | A model cannot grant authority |
| Time | Temporal graph with effective and expiry dates | Current-state flags | An assignment made last month needs last month's privileges |
| Evidence | Missing-evidence alert | Silent ineligible | Missing records are a data problem not a finding |
| Prioritisation | Model ranks exceptions for human review | Model decides eligibility | Ranking is safe and decision is not |
| Explanation | Rule and source citation per result | A score | Committees need the rule not a number |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Provider case volume as a quality proxy | not an authorisation criterion |
| Seniority | not a privilege |
| Manager request urgency | pressure not evidence |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Privilege coverage inputs | Medical staff office | Credentialing and privileging system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: catalogue version at the assignment date. |
| Credential validity at date inputs | Privileging committee | Medical staff bylaws and privilege catalogue | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use effective dates. |
| Supervision requirement inputs | Perioperative services | Scheduling and operating-room system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: rules as published. |
| Exception novelty inputs | Compliance | Provider master data | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: past adjudicated exceptions only. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: provider_privilege_scope_of_practice_inputs.v1
owner: medical-staff-office@example.com
system_of_record: Credentialing and privileging system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: privilege_coverage, type: double, nullable: false }
    - { name: credential_validity_at_date, type: double, nullable: false }
    - { name: supervision_requirement, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Privilege coverage and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Credential validity at date against Credentialing and privileging system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Privilege coverage, traces back to Credentialing and privileging system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| GH Archive | https://www.gharchive.org/ | Public event data (see the site) | Hourly public GitHub events: pushes, pull requests, issues and reviews | Public repositories only; bot noise. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| PhysioNet / Computing in Cardiology Challenge 2019: Early Prediction of Sepsis | https://physionet.org/content/challenge-2019/1.0.0/ | CC BY 4.0 (see the page) | Hourly vitals, labs and a sepsis label for about 40,000 ICU patients | Labels are rule-derived and the two hospital systems differ in sampling. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MIMIC-IV | https://physionet.org/content/mimiciv/3.1/ | PhysioNet Credentialed Health Data License; credentialing required | De-identified hospital and ICU stays with vitals, labs, medications and procedures | Credentialed access; single centre. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE provider_privilege_scope_of_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE provider_privilege_scope_of_outputs (
  run_id TEXT NOT NULL REFERENCES provider_privilege_scope_of_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE provider_privilege_scope_of_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE provider_privilege_scope_of_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Provider Privilege & Scope-of-Practice Validation": Detect mismatches between provider qualifications, granted privileges, specialty, facility rules and proposed assignments or procedures, and give the medical staff office an auditable explanation of each exception. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Alert fatigue and the response workflow | Nurses and physicians see many alerts per shift. Alerts that fire too often are ignored or disabled, and an alert is only useful if a named person knows what to do within a set time. Hospital quality programmes, such as the SEP-1 bundle in the United States, define the care steps that should follow suspected sepsis. | The right metric is sensitivity and lead time at an agreed alert burden, agreed with ward leadership before modelling. |
| Regulation, privacy and trust in clinical AI | Clinical software may be regulated as a medical device, patient data is protected by privacy law, models must be validated on the population where they will run, and clinicians need to understand and override outputs. Federated approaches let hospitals learn together without sharing records. | Plan for validation evidence, post-deployment monitoring and de-identification from the first design review. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Privilege coverage | Procedure code mapped to required privilege vs granted privilege. The core eligibility test. | Leakage risk to design against: Catalogue version at the assignment date. |
| A signal-versus-noise trap in this use case: Authority | The true signal is deterministic rules from bylaws and policy; the common noise is a learned authorisation score. | A model cannot grant authority. |

**Ask the experts**

- [ ] What exactly does "A rules engine decides eligibility and the model may only prioritise exceptions and never invents clinical authorisation" mean in practice for provider privilege & scope-of-practice validation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Privilege coverage" and "Credential validity at date", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Assignments flagged before the case date" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: letting the ranker decide eligibility, and who can confirm the cut-off times and splits?
- [ ] How often does "Bylaws amended mid-year" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Clinical decision support | Software that gives clinicians patient-specific recommendations or alerts at the point of care. |
| FHIR / HL7 | Standards for exchanging health data between systems; the alert pipeline typically consumes FHIR or HL7 messages. |
| Alert burden | How many alerts clinicians receive per unit of care, which has to stay low enough that they keep responding. |
| Radiology report | The radiologist's written interpretation of an image, a common source of labels. |
| Ambient scribe | A system that listens to a visit and drafts the clinical note for the clinician to review. |
| Nurse staffing ratio | The number of patients per nurse permitted on a unit, often set by policy or law. |
| Care management | Programmes that give extra support to high-risk patients, which risk models are used to target. |
| Node / edge | The entities in a graph and the relationships between them. |
| Degree | The number of edges attached to a node; very high degree marks a hub. |
| Connected component | A set of nodes in which each can reach every other through edges. |
| Motif | A small recurring subgraph pattern such as a cycle or a fan-out. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| F1 score | The harmonic mean of precision and recall. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Hub node | A node connected to a very large number of others, such as a shared public address. |
| Cluster purity | The share of a cluster that belongs to its majority true group. |
| Pairwise precision / recall | Precision and recall computed over pairs of records that are put in the same cluster. |
