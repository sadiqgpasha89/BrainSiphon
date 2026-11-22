# Vendor Access Policy Violation Detection: data and feature specification

> Generated from the blueprint `healthcare/vendor-access-policy-violation-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Vendor Access Policy Violation Detection · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Vendor Access Policy Violation Detection": Detect access attempts that conflict with approved hours, locations, credentials, visit purpose or restricted-area rules, with an evidence timeline, a severity and an escalation path for security staff. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Letting an anomaly model define a violation.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Authorisation mismatch | access outside the approved window, area or purpose | Direct violation | Authorisations as at the event |   |   |   |
| Credential state at event time | whether required credentials were valid | Invalid credentials make access non-compliant | Point-in-time status |   |   |   |
| Restricted-area sensitivity | zone risk class | Severity weighting | From the zone register |   |   |   |
| Repeat-pattern count | similar events by the same vendor in the last 30 days | Repeated breaches differ from isolated ones | Past events |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Rules | Policy rules over authorised windows, areas and credentials | A learned violation classifier | Violations are defined by policy not by pattern |
| Evidence | Timeline of access, authorisation and credential state | Single event | One event rarely proves a violation |
| Severity | Restricted-area and patient-area weighting | Equal weights | Some zones carry far higher risk |
| Models | Anomaly score ranks the residual | Anomaly as the decision | Residual ranking helps without defining violation |
| Response | Escalation path to named roles | Unrouted alert | Alerts without owners are ignored |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Vendor revenue | irrelevant |
| Badge reader brand | artefact |
| Representative identity | privacy |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Authorisation mismatch inputs | Facility security | Facility access control system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: authorisations as at the event. |
| Credential state at event time inputs | Compliance | Visitor and vendor management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: point-in-time status. |
| Restricted-area sensitivity inputs | Vendor management | Access policy register | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the zone register. |
| Repeat-pattern count inputs | Facility security | Credential compliance records | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: past events. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: vendor_access_policy_violation_detection_inputs.v1
owner: facility-security@example.com
system_of_record: Facility access control system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: authorisation_mismatch, type: double, nullable: false }
    - { name: credential_state_at_event_time, type: double, nullable: false }
    - { name: restricted_area_sensitivity, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Authorisation mismatch and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Credential state at event time against Facility access control system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Authorisation mismatch, traces back to Facility access control system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| OTRF Security-Datasets (Mordor) | https://github.com/OTRF/Security-Datasets | MIT-style open licence (see the repository) | Pre-recorded telemetry for individual attack techniques mapped to MITRE ATT&CK | Lab-generated, little benign background. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CIC-IDS2017 intrusion detection | https://www.unb.ca/cic/datasets/ids-2017.html | Research use with citation (see the page) | Labelled network flows with benign traffic and common attacks over five days | Lab traffic; known labelling issues in places. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| LANL Comprehensive Multi-Source Cyber-Security Events | https://csr.lanl.gov/data/cyber1/ | Research release from Los Alamos National Laboratory (see the page) | 58 days of authentication, process, flow and DNS events with a red-team subset | Anonymised and very large. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE vendor_access_policy_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE vendor_access_policy_outputs (
  run_id TEXT NOT NULL REFERENCES vendor_access_policy_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE vendor_access_policy_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE vendor_access_policy_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Vendor Access Policy Violation Detection": Detect access attempts that conflict with approved hours, locations, credentials, visit purpose or restricted-area rules, with an evidence timeline, a severity and an escalation path for security staff. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Alert fatigue and the response workflow | Nurses and physicians see many alerts per shift. Alerts that fire too often are ignored or disabled, and an alert is only useful if a named person knows what to do within a set time. Hospital quality programmes, such as the SEP-1 bundle in the United States, define the care steps that should follow suspected sepsis. | The right metric is sensitivity and lead time at an agreed alert burden, agreed with ward leadership before modelling. |
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Authorisation mismatch | Access outside the approved window, area or purpose. Direct violation. | Leakage risk to design against: Authorisations as at the event. |
| A signal-versus-noise trap in this use case: Rules | The true signal is policy rules over authorised windows, areas and credentials; the common noise is a learned violation classifier. | Violations are defined by policy not by pattern. |

**Ask the experts**

- [ ] What exactly does "A deterministic policy engine decides violations and anomaly models are supplemental only" mean in practice for vendor access policy violation detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Authorisation mismatch" and "Credential state at event time", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Confirmed violations resolved within SLA" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: letting an anomaly model define a violation, and who can confirm the cut-off times and splits?
- [ ] How often does "Clock skew between systems" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Claim denial | An insurer's refusal to pay a claim, often fixable with correct documentation. |
| Patient-day | One patient present for one day, the denominator for alert burden such as alerts per 100 patient-days. |
| Alert burden | How many alerts clinicians receive per unit of care, which has to stay low enough that they keep responding. |
| ICD / CPT | Code sets for diagnoses (ICD) and procedures (CPT) used in billing and reporting. |
| Radiology report | The radiologist's written interpretation of an image, a common source of labels. |
| PHI | Protected health information: any health data that can identify a patient. |
| De-identification | Removing or masking identifiers from health data so it can be used for research. |
| Federated learning | Training a shared model across institutions without moving their data. |
| Clinical decision support | Software that gives clinicians patient-specific recommendations or alerts at the point of care. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| Stationarity | A series whose statistical properties do not change over time. |
| Changepoint | A moment when the behaviour of a series changes, such as a level shift. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| F1 score | The harmonic mean of precision and recall. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
