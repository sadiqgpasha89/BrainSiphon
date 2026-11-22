# Facility Access Pattern Anomaly Detection: data and feature specification

> Generated from the blueprint `healthcare/facility-access-pattern-anomaly-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Facility Access Pattern Anomaly Detection · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Facility Access Pattern Anomaly Detection": Detect unusual access patterns across facilities, staff, contractors and authorised visitors, show the affected access path and evidence, and send the case to security triage with hard policy checks run first. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Treating anomalies as violations.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Path novelty | whether the zone sequence is unseen for the identity and role | Detects off-pattern routes | Past paths |   |   |   |
| Schedule alignment | access time relative to the rostered shift | Separates normal from off-shift access | Roster snapshot |   |   |   |
| Role-zone fit | zones accessed against the role's allowed set | Strong policy signal | Role as of the event |   |   |   |
| Peer deviation | difference from peers with the same role and unit | Normalises for site behaviour | Same period |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Policy | Hard policy checks for zones, times and roles | Anomaly score as a rule breach | Policy is a fact and anomaly is a hint |
| Context | Shift schedule, role and event calendar | Raw badge events | A night-shift employee is not unusual at night |
| Path | Sequence and graph of zones visited | Individual events | Unusual routes show up only in the path |
| Privacy | Minimised data with purpose limits | Monitoring of everyone | Surveillance beyond purpose breaks trust and law |
| Language | Unusual pattern for triage | Suspect | Wrong labels harm staff |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Employee demographics | protected |
| Badge issue date | not behaviour |
| Reader vendor | artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Path novelty inputs | Facility security | Facility access control system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: past paths. |
| Schedule alignment inputs | Privacy office | Identity and role directory | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: roster snapshot. |
| Role-zone fit inputs | HR operations | Shift and roster system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: role as of the event. |
| Peer deviation inputs | Facilities | Access policy register | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: same period. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: facility_access_pattern_anomaly_inputs.v1
owner: facility-security@example.com
system_of_record: Facility access control system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: path_novelty, type: double, nullable: false }
    - { name: schedule_alignment, type: double, nullable: false }
    - { name: role_zone_fit, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Path novelty and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Schedule alignment against Facility access control system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Path novelty, traces back to Facility access control system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Numenta Anomaly Benchmark (NAB) | https://github.com/numenta/NAB | AGPL-3.0 (see the repository) | 58 labelled real and synthetic time series for streaming anomaly detection with a scoring scheme | Small and labels are debated. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| LANL Comprehensive Multi-Source Cyber-Security Events | https://csr.lanl.gov/data/cyber1/ | Research release from Los Alamos National Laboratory (see the page) | 58 days of authentication, process, flow and DNS events with a red-team subset | Anonymised and very large. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CIC-IDS2017 intrusion detection | https://www.unb.ca/cic/datasets/ids-2017.html | Research use with citation (see the page) | Labelled network flows with benign traffic and common attacks over five days | Lab traffic; known labelling issues in places. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE facility_access_pattern_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE facility_access_pattern_outputs (
  run_id TEXT NOT NULL REFERENCES facility_access_pattern_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE facility_access_pattern_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE facility_access_pattern_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Facility Access Pattern Anomaly Detection": Detect unusual access patterns across facilities, staff, contractors and authorised visitors, show the affected access path and evidence, and send the case to security triage with hard policy checks run first. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Alert fatigue and the response workflow | Nurses and physicians see many alerts per shift. Alerts that fire too often are ignored or disabled, and an alert is only useful if a named person knows what to do within a set time. Hospital quality programmes, such as the SEP-1 bundle in the United States, define the care steps that should follow suspected sepsis. | The right metric is sensitivity and lead time at an agreed alert burden, agreed with ward leadership before modelling. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Path novelty | Whether the zone sequence is unseen for the identity and role. Detects off-pattern routes. | Leakage risk to design against: Past paths. |
| A signal-versus-noise trap in this use case: Policy | The true signal is hard policy checks for zones, times and roles; the common noise is anomaly score as a rule breach. | Policy is a fact and anomaly is a hint. |

**Ask the experts**

- [ ] What exactly does "Hard policy checks run first and anomaly findings never decide a violation" mean in practice for facility access pattern anomaly detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Path novelty" and "Schedule alignment", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Confirmed findings per 1000 alerts" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: treating anomalies as violations, and who can confirm the cut-off times and splits?
- [ ] How often does "Reorganisation changes roles" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Remote patient monitoring | Tracking patients' vital signs at home and alerting clinicians to changes. |
| Alert burden | How many alerts clinicians receive per unit of care, which has to stay low enough that they keep responding. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Triage | Sorting patients by urgency to decide who is seen first. |
| Ordinal triage scale | A graded urgency scale in which being wrong by two levels is worse than by one. |
| Radiology report | The radiologist's written interpretation of an image, a common source of labels. |
| Sensitivity / specificity | The share of true cases caught and the share of healthy cases correctly cleared. |
| PHI | Protected health information: any health data that can identify a patient. |
| De-identification | Removing or masking identifiers from health data so it can be used for research. |
| Federated learning | Training a shared model across institutions without moving their data. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| Level shift | An abrupt, lasting change in a series' average. |
| Stationarity | A series whose statistical properties do not change over time. |
| Motif | A small recurring subgraph pattern such as a cycle or a fan-out. |
| Pairwise precision / recall | Precision and recall computed over pairs of records that are put in the same cluster. |
| Node / edge | The entities in a graph and the relationships between them. |
| Degree | The number of edges attached to a node; very high degree marks a hub. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Distribution shift | A change in the data a model sees compared with training. |
| Remaining useful life | The estimated time before a machine or component fails. |
