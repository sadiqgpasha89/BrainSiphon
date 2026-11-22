# Physician Availability & Schedule Conflict Detection: data and feature specification

> Generated from the blueprint `healthcare/physician-availability-schedule-conflict-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Physician Availability & Schedule Conflict Detection · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Physician Availability & Schedule Conflict Detection": Detect overlapping clinic, operating room, call, telehealth and multi-facility commitments, including travel-time infeasibility, and propose resolutions with the affected appointments and coverage. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using a model for logical conflicts.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Overlap duration | minutes of overlap between commitments | Defines the conflict | Event times |   |   |   |
| Travel infeasibility margin | travel time plus buffer against the gap between commitments | Detects impossible moves | Travel-time table version |   |   |   |
| Privilege and site eligibility | whether the physician may practise at the site | Invalid assignments | Privilege register |   |   |   |
| Affected patient volume | appointments and procedures touched by the conflict | Severity ranking | Schedule snapshot |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Detection | Deterministic overlap and travel-time checks | Learned conflict classifier | Conflicts are logical facts |
| Travel | Facility travel times with buffers | Same-day assumption | Two sites an hour apart cannot both be served |
| Severity | Impact on patients and coverage | Conflict count | A cancelled surgery outweighs a clinic overlap |
| Resolution | Proposal with affected items | Auto-reschedule | Changes affect patients |
| Cross-system view | Merged events across systems | One system at a time | Conflicts span clinic, OR and call |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Commitment title | label |
| Entry time | process artefact |
| Physician seniority | not a conflict factor |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Overlap duration inputs | Physician scheduling office | Clinic scheduling system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: event times. |
| Travel infeasibility margin inputs | Clinical operations | OR scheduling system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: travel-time table version. |
| Privilege and site eligibility inputs | Medical staff office | Call and telehealth schedules | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: privilege register. |
| Affected patient volume inputs | Access centre | Facility location and travel-time tables | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: schedule snapshot. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: physician_availability_schedule_inputs.v1
owner: physician-scheduling-office@example.com
system_of_record: Clinic scheduling system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: overlap_duration, type: double, nullable: false }
    - { name: travel_infeasibility_margin, type: double, nullable: false }
    - { name: privilege_and_site_eligibility, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Overlap duration and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Travel infeasibility margin against Clinic scheduling system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Overlap duration, traces back to Clinic scheduling system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| CIC-IDS2017 intrusion detection | https://www.unb.ca/cic/datasets/ids-2017.html | Research use with citation (see the page) | Labelled network flows with benign traffic and common attacks over five days | Lab traffic; known labelling issues in places. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OTRF Security-Datasets (Mordor) | https://github.com/OTRF/Security-Datasets | MIT-style open licence (see the repository) | Pre-recorded telemetry for individual attack techniques mapped to MITRE ATT&CK | Lab-generated, little benign background. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Numenta Anomaly Benchmark (NAB) | https://github.com/numenta/NAB | AGPL-3.0 (see the repository) | 58 labelled real and synthetic time series for streaming anomaly detection with a scoring scheme | Small and labels are debated. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE physician_availability_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE physician_availability_outputs (
  run_id TEXT NOT NULL REFERENCES physician_availability_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE physician_availability_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE physician_availability_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Physician Availability & Schedule Conflict Detection": Detect overlapping clinic, operating room, call, telehealth and multi-facility commitments, including travel-time infeasibility, and propose resolutions with the affected appointments and coverage. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Hospital operations and capacity | Hospitals schedule operating rooms, staff nurses, forecast emergency demand, manage beds and dispatch ambulances. Demand is lumpy, costs of waiting are asymmetric and safety limits on staffing are hard constraints. | Forecasts and schedules are judged by waiting time, overtime and safety margins, not average error. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Overlap duration | Minutes of overlap between commitments. Defines the conflict. | Leakage risk to design against: Event times. |
| A signal-versus-noise trap in this use case: Detection | The true signal is deterministic overlap and travel-time checks; the common noise is learned conflict classifier. | Conflicts are logical facts. |

**Ask the experts**

- [ ] What exactly does "The scheduling office confirms every change and any patient communication" mean in practice for physician availability & schedule conflict detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Overlap duration" and "Travel infeasibility margin", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Conflicts found before patients are affected" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: using a model for logical conflicts, and who can confirm the cut-off times and splits?
- [ ] How often does "Time zone difference between systems" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| OR block time | Reserved operating room time given to surgeons or services. |
| Patient-day | One patient present for one day, the denominator for alert burden such as alerts per 100 patient-days. |
| Nurse staffing ratio | The number of patients per nurse permitted on a unit, often set by policy or law. |
| Wearable | A body-worn sensor, such as a watch, that records heart rate, movement or sleep. |
| Remote patient monitoring | Tracking patients' vital signs at home and alerting clinicians to changes. |
| Cohort | A defined group of patients used for a study or for matching to trials. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Remaining useful life | The estimated time before a machine or component fails. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| F1 score | The harmonic mean of precision and recall. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
