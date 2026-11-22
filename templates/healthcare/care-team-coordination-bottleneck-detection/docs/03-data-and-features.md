# Care-Team Coordination Bottleneck Detection: data and feature specification

> Generated from the blueprint `healthcare/care-team-coordination-bottleneck-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Care-Team Coordination Bottleneck Detection · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Care-Team Coordination Bottleneck Detection": Identify delays in handoffs, referrals, discharges, consults and cross-team coordination, and show process owners the bottleneck stage, the delay drivers and the pathways affected. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Reading associations as causes.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Stage waiting time | time between handoff and the next action for each stage | The delay measure | Event timestamps |   |   |   |
| Handoff volume and queue length | work waiting at the stage | Load context | Event stream |   |   |   |
| Variant frequency | share of cases following each path | Reveals rework and detours | Event log |   |   |   |
| Staffing and census context | staffing level and census at the time | Context for delay | Earlier periods |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Event log | Cleaned event log with case, activity and timestamp | Raw event dump | Process mining needs consistent cases |
| Bottleneck | Stage waiting time against the service level | Total case time | The delay sits in one stage |
| Unit | Pathway, stage and team | Individual staff | The aim is workflow improvement |
| Drivers | Associations with context shown | Causal claims | Observational data cannot prove cause |
| Authority | Owners redesign | Automatic workflow change | Workflow changes need clinical ownership |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Case identifier | label |
| Free-text task notes | noisy |
| Task creator | not a bottleneck factor |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Stage waiting time inputs | Process owners | Workflow and task management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: event timestamps. |
| Handoff volume and queue length inputs | Clinical operations | Referral and consult system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: event stream. |
| Variant frequency inputs | Care coordination | Discharge milestone records | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: event log. |
| Staffing and census context inputs | Quality | Message event data | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: earlier periods. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: care_team_coordination_bottleneck_inputs.v1
owner: process-owners@example.com
system_of_record: Workflow and task management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: stage_waiting_time, type: double, nullable: false }
    - { name: handoff_volume_and_queue_length, type: double, nullable: false }
    - { name: variant_frequency, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Stage waiting time and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Handoff volume and queue length against Workflow and task management system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Stage waiting time, traces back to Workflow and task management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Numenta Anomaly Benchmark (NAB) | https://github.com/numenta/NAB | AGPL-3.0 (see the repository) | 58 labelled real and synthetic time series for streaming anomaly detection with a scoring scheme | Small and labels are debated. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CIC-IDS2017 intrusion detection | https://www.unb.ca/cic/datasets/ids-2017.html | Research use with citation (see the page) | Labelled network flows with benign traffic and common attacks over five days | Lab traffic; known labelling issues in places. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OTRF Security-Datasets (Mordor) | https://github.com/OTRF/Security-Datasets | MIT-style open licence (see the repository) | Pre-recorded telemetry for individual attack techniques mapped to MITRE ATT&CK | Lab-generated, little benign background. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE care_team_coordination_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE care_team_coordination_outputs (
  run_id TEXT NOT NULL REFERENCES care_team_coordination_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE care_team_coordination_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE care_team_coordination_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Care-Team Coordination Bottleneck Detection": Identify delays in handoffs, referrals, discharges, consults and cross-team coordination, and show process owners the bottleneck stage, the delay drivers and the pathways affected. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Clinical data: what the record really contains | The electronic health record holds structured data (vitals, labs, medications, orders, diagnosis codes) and free text (notes, reports). Timestamps differ for ordering, collection and result; documentation is written after the fact; billing codes reflect reimbursement as much as truth; missingness is informative because tests are ordered when clinicians are worried. | Features and labels built from the record encode clinical behaviour, so leakage and bias are the default, not the exception. |
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Drug discovery and genomics | Early discovery predicts molecular properties, binding and toxicity; genomics predicts the effect of variants and risk from many small genetic effects. Data are small, assays noisy, and the cost of a wrong prediction is a failed experiment, so uncertainty estimates matter. | Random splits are overly optimistic; scaffold or lineage splits show how a model generalises to new chemistry or populations. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Stage waiting time | Time between handoff and the next action for each stage. The delay measure. | Leakage risk to design against: Event timestamps. |
| A signal-versus-noise trap in this use case: Event log | The true signal is cleaned event log with case, activity and timestamp; the common noise is raw event dump. | Process mining needs consistent cases. |

**Ask the experts**

- [ ] What exactly does "Process owners validate findings and redesign workflows and the analytics change no workflow" mean in practice for care-team coordination bottleneck detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Stage waiting time" and "Handoff volume and queue length", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Cycle time for the target pathways" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: reading associations as causes, and who can confirm the cut-off times and splits?
- [ ] How often does "Missing timestamps" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Ambient scribe | A system that listens to a visit and drafts the clinical note for the clinician to review. |
| Care management | Programmes that give extra support to high-risk patients, which risk models are used to target. |
| Patient-day | One patient present for one day, the denominator for alert burden such as alerts per 100 patient-days. |
| ICD / CPT | Code sets for diagnoses (ICD) and procedures (CPT) used in billing and reporting. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Claim denial | An insurer's refusal to pay a claim, often fixable with correct documentation. |
| Readmission | A return to hospital shortly after discharge, usually counted within 30 days and tied to quality penalties. |
| Radiology report | The radiologist's written interpretation of an image, a common source of labels. |
| PHI | Protected health information: any health data that can identify a patient. |
| De-identification | Removing or masking identifiers from health data so it can be used for research. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Stationarity | A series whose statistical properties do not change over time. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Changepoint | A moment when the behaviour of a series changes, such as a level shift. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
