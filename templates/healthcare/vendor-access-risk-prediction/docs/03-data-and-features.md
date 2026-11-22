# Vendor Access Risk Prediction: data and feature specification

> Generated from the blueprint `healthcare/vendor-access-risk-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Vendor Access Risk Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Vendor Access Risk Prediction": Identify unusual vendor access patterns, such as unexpected location, time or frequency and policy deviations, so security staff can review with explainable context and no automatic accusation. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on investigated cases only.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Time and zone deviation | distance of a visit from the vendor's usual time and zones | The primary behavioural signal | Baselines from earlier periods |   |   |   |
| Frequency change | change in visit rate against the vendor baseline | Detects drift in activity | Trailing windows |   |   |   |
| Access path novelty | whether the sequence of zones is new for the vendor | Graph path anomaly | Past paths only |   |   |   |
| Authorisation gap | access outside the scheduled visit window or purpose | Direct policy deviation | Schedule snapshot at the time |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Policy | Deterministic policy check against authorisation | Anomaly score as the finding | A policy breach is a fact not a probability |
| Baseline | Per-vendor and per-zone behaviour baseline | Global thresholds | Vendors differ by service and site |
| Context | Visit schedule and event calendar in the model | Access events alone | A planned installation explains a night visit |
| Language | Unusual pattern for review | Suspicious vendor | Labelling people causes harm and legal exposure |
| Budget | Alerts per reviewer per week | Maximum recall | Reviewers stop trusting noisy alerts |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Vendor company name | irrelevant to behaviour |
| Individual representative demographics | protected |
| Badge reader brand | hardware artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Time and zone deviation inputs | Facility security | Facility access control system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: baselines from earlier periods. |
| Frequency change inputs | Vendor management | Visitor and vendor management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: trailing windows. |
| Access path novelty inputs | Privacy office | Role-based access policy register | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: past paths only. |
| Authorisation gap inputs | Compliance | Facility access control system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: schedule snapshot at the time. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: vendor_access_risk_prediction_inputs.v1
owner: facility-security@example.com
system_of_record: Facility access control system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: time_and_zone_deviation, type: double, nullable: false }
    - { name: frequency_change, type: double, nullable: false }
    - { name: access_path_novelty, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Time and zone deviation and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Frequency change against Facility access control system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Time and zone deviation, traces back to Facility access control system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| UCR Time Series Archive | https://www.cs.ucr.edu/~eamonn/time_series_data_2018/ | Research use with citation (see the page) | 128 labelled time-series classification datasets | Short curated series. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| LANL Comprehensive Multi-Source Cyber-Security Events | https://csr.lanl.gov/data/cyber1/ | Research release from Los Alamos National Laboratory (see the page) | 58 days of authentication, process, flow and DNS events with a red-team subset | Anonymised and very large. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CIC-IDS2017 intrusion detection | https://www.unb.ca/cic/datasets/ids-2017.html | Research use with citation (see the page) | Labelled network flows with benign traffic and common attacks over five days | Lab traffic; known labelling issues in places. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE vendor_access_risk_prediction_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE vendor_access_risk_prediction_outputs (
  run_id TEXT NOT NULL REFERENCES vendor_access_risk_prediction_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE vendor_access_risk_prediction_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE vendor_access_risk_prediction_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Vendor Access Risk Prediction": Identify unusual vendor access patterns, such as unexpected location, time or frequency and policy deviations, so security staff can review with explainable context and no automatic accusation. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Alert fatigue and the response workflow | Nurses and physicians see many alerts per shift. Alerts that fire too often are ignored or disabled, and an alert is only useful if a named person knows what to do within a set time. Hospital quality programmes, such as the SEP-1 bundle in the United States, define the care steps that should follow suspected sepsis. | The right metric is sensitivity and lead time at an agreed alert burden, agreed with ward leadership before modelling. |
| Hospital operations and capacity | Hospitals schedule operating rooms, staff nurses, forecast emergency demand, manage beds and dispatch ambulances. Demand is lumpy, costs of waiting are asymmetric and safety limits on staffing are hard constraints. | Forecasts and schedules are judged by waiting time, overtime and safety margins, not average error. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Time and zone deviation | Distance of a visit from the vendor's usual time and zones. The primary behavioural signal. | Leakage risk to design against: Baselines from earlier periods. |
| A signal-versus-noise trap in this use case: Policy | The true signal is deterministic policy check against authorisation; the common noise is anomaly score as the finding. | A policy breach is a fact not a probability. |

**Ask the experts**

- [ ] What exactly does "A strict allow-list and policy rules decide violations and anomaly models are supplemental" mean in practice for vendor access risk prediction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Time and zone deviation" and "Frequency change", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Confirmed policy exceptions found" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on investigated cases only, and who can confirm the cut-off times and splits?
- [ ] How often does "New vendor" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Alert burden | How many alerts clinicians receive per unit of care, which has to stay low enough that they keep responding. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Triage | Sorting patients by urgency to decide who is seen first. |
| Ordinal triage scale | A graded urgency scale in which being wrong by two levels is worse than by one. |
| Radiology report | The radiologist's written interpretation of an image, a common source of labels. |
| PHI | Protected health information: any health data that can identify a patient. |
| De-identification | Removing or masking identifiers from health data so it can be used for research. |
| Federated learning | Training a shared model across institutions without moving their data. |
| Clinical decision support | Software that gives clinicians patient-specific recommendations or alerts at the point of care. |
| Nurse staffing ratio | The number of patients per nurse permitted on a unit, often set by policy or law. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| Changepoint | A moment when the behaviour of a series changes, such as a level shift. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Link prediction | Predicting whether an edge exists or will form between two nodes. |
| Pairwise precision / recall | Precision and recall computed over pairs of records that are put in the same cluster. |
| Node / edge | The entities in a graph and the relationships between them. |
| Degree | The number of edges attached to a node; very high degree marks a hub. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Distribution shift | A change in the data a model sees compared with training. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
| Remaining useful life | The estimated time before a machine or component fails. |
