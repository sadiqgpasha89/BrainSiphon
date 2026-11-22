# Workforce Productivity & FTE Leakage Detection: data and feature specification

> Generated from the blueprint `healthcare/workforce-productivity-fte-leakage-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Workforce Productivity & FTE Leakage Detection · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Workforce Productivity & FTE Leakage Detection": Detect unexplained variance between staffed hours, workload, service volume and approved budgets, and queue it as an investigation lead with an estimated financial exposure and no allegation attached. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Calling a data gap a leakage finding.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Hours per workload unit | worked hours divided by acuity-weighted workload | The core productivity ratio after normalisation | Use the settled workload for the period |   |   |   |
| Variance decomposition | volume effect, mix effect, rate effect and unexplained residual | Shows where exposure actually lives | Decomposition must reconcile to the ledger |   |   |   |
| Budget-to-actual drift | cumulative FTE variance over rolling periods | Persistent drift matters more than single-day noise | Use closed periods for scoring |   |   |   |
| Data-quality index | share of missing punches, unmapped cost centres and late entries | Tells a leader whether to trust the finding | Computed from the same extract as the metric |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Normalisation | Hours per workload unit adjusted for acuity and case mix | Raw hours per patient | A sicker unit looks wasteful when it is simply busier |
| Data quality | Missing-punch and mapping gates before analysis | Flagging every gap as leakage | Most gaps are data defects not leakage |
| Attribution | Variance split into volume, mix, rate and data effects | One total variance number | A leader cannot act on an unexplained total |
| Language | Investigation lead with evidence | Accusation or ranking of individuals | A flag aimed at people destroys trust and invites gaming |
| Seasonality | Variance against a seasonal and event-aware baseline | A fixed percentage threshold | Holidays trigger false alarms every year |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Overtime alone | reflects coverage decisions as well as leakage |
| Individual punch patterns | privacy-sensitive and attributes intent |
| Single-day outliers | usually data or event artefacts |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Hours per workload unit inputs | Finance workforce analytics | Timekeeping and payroll system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use the settled workload for the period. |
| Variance decomposition inputs | Operations excellence | Cost-centre and budget ledger | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: decomposition must reconcile to the ledger. |
| Budget-to-actual drift inputs | HR business partners | Patient volume and workload system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use closed periods for scoring. |
| Data-quality index inputs | Finance workforce analytics | Approved productivity-definition register | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: computed from the same extract as the metric. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: workforce_productivity_fte_leakage_inputs.v1
owner: finance-workforce-analytics@example.com
system_of_record: Timekeeping and payroll system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: hours_per_workload_unit, type: double, nullable: false }
    - { name: variance_decomposition, type: double, nullable: false }
    - { name: budget_to_actual_drift, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Hours per workload unit and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Variance decomposition against Timekeeping and payroll system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Hours per workload unit, traces back to Timekeeping and payroll system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Numenta Anomaly Benchmark (NAB) | https://github.com/numenta/NAB | AGPL-3.0 (see the repository) | 58 labelled real and synthetic time series for streaming anomaly detection with a scoring scheme | Small and labels are debated. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CIC-IDS2017 intrusion detection | https://www.unb.ca/cic/datasets/ids-2017.html | Research use with citation (see the page) | Labelled network flows with benign traffic and common attacks over five days | Lab traffic; known labelling issues in places. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Server Machine Dataset (OmniAnomaly) | https://github.com/NetManAIOps/OmniAnomaly | MIT licence (see the repository) | Multivariate server metrics from an internet company with labelled anomalies | One company; coarse labels. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE workforce_productivity_fte_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE workforce_productivity_fte_outputs (
  run_id TEXT NOT NULL REFERENCES workforce_productivity_fte_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE workforce_productivity_fte_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE workforce_productivity_fte_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Workforce Productivity & FTE Leakage Detection": Detect unexplained variance between staffed hours, workload, service volume and approved budgets, and queue it as an investigation lead with an estimated financial exposure and no allegation attached. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Hospital operations and capacity | Hospitals schedule operating rooms, staff nurses, forecast emergency demand, manage beds and dispatch ambulances. Demand is lumpy, costs of waiting are asymmetric and safety limits on staffing are hard constraints. | Forecasts and schedules are judged by waiting time, overtime and safety margins, not average error. |
| Regulation, privacy and trust in clinical AI | Clinical software may be regulated as a medical device, patient data is protected by privacy law, models must be validated on the population where they will run, and clinicians need to understand and override outputs. Federated approaches let hospitals learn together without sharing records. | Plan for validation evidence, post-deployment monitoring and de-identification from the first design review. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Hours per workload unit | Worked hours divided by acuity-weighted workload. The core productivity ratio after normalisation. | Leakage risk to design against: Use the settled workload for the period. |
| A signal-versus-noise trap in this use case: Normalisation | The true signal is hours per workload unit adjusted for acuity and case mix; the common noise is raw hours per patient. | A sicker unit looks wasteful when it is simply busier. |

**Ask the experts**

- [ ] What exactly does "Variance is normalised for case mix, acuity and local operating conditions before it is flagged" mean in practice for workforce productivity & fte leakage detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Hours per workload unit" and "Variance decomposition", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Recovered or explained exposure" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: calling a data gap a leakage finding, and who can confirm the cut-off times and splits?
- [ ] How often does "Unit changes service mix" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Patient-day | One patient present for one day, the denominator for alert burden such as alerts per 100 patient-days. |
| Alert burden | How many alerts clinicians receive per unit of care, which has to stay low enough that they keep responding. |
| Lead time | How many hours before onset an alert fires, the quantity that makes an early-warning system clinically useful. |
| Radiology report | The radiologist's written interpretation of an image, a common source of labels. |
| PHI | Protected health information: any health data that can identify a patient. |
| De-identification | Removing or masking identifiers from health data so it can be used for research. |
| Federated learning | Training a shared model across institutions without moving their data. |
| Clinical decision support | Software that gives clinicians patient-specific recommendations or alerts at the point of care. |
| OR block time | Reserved operating room time given to surgeons or services. |
| Nurse staffing ratio | The number of patients per nurse permitted on a unit, often set by policy or law. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| Robust z-score | A deviation measure using the median and median absolute deviation, which outliers do not distort. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
