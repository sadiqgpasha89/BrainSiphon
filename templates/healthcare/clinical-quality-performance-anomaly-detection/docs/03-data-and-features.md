# Clinical Quality Performance Anomaly Detection: data and feature specification

> Generated from the blueprint `healthcare/clinical-quality-performance-anomaly-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Clinical Quality Performance Anomaly Detection · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Clinical Quality Performance Anomaly Detection": Detect unexpected changes in quality indicators across facilities, units, specialties and time, and tell analysts whether a change is more likely a data problem or a real performance shift before escalating. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Treating data defects as performance.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Adjusted deviation from baseline | standardised residual after seasonality and case mix | The core anomaly score | Baseline fit on earlier periods |   |   |   |
| Data completeness at cut-off | share of expected records present | Separates lag from change | At the cut-off |   |   |   |
| Definition change flag | measure or coding version change in the window | Common source of artefacts | Version tags |   |   |   |
| Cross-unit coherence | whether peer units show the same shift | Shared shifts suggest data or policy changes | Same period |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Data first | Data-quality gate on completeness and definition changes | Treating every change as performance | Most apparent shifts are data defects |
| Baseline | Seasonal, case-mix-adjusted baseline | A fixed control limit | Holidays and mix shifts fire false alarms |
| Volume | Statistical tests aware of denominators | Raw rate thresholds | Small denominators fluctuate widely |
| Attribution | Data or performance cause with evidence | Alert without context | Analysts then investigate blind |
| Budget | Weekly alert budget agreed with analysts | Maximum sensitivity | Analysts stop looking |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Single low-denominator month | noise |
| Unreviewed manual overrides | inconsistent |
| Weekend effects in monthly measures | seasonality |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Adjusted deviation from baseline inputs | Quality analytics | Quality and performance reporting system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: baseline fit on earlier periods. |
| Data completeness at cut-off inputs | Clinical informatics | Enterprise data warehouse | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: at the cut-off. |
| Definition change flag inputs | Data engineering | Measure specification library | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: version tags. |
| Cross-unit coherence inputs | Quality and patient safety | Quality and performance reporting system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: same period. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: clinical_quality_performance_anomaly_inputs.v1
owner: quality-analytics@example.com
system_of_record: Quality and performance reporting system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: adjusted_deviation_from_baseline, type: double, nullable: false }
    - { name: data_completeness_at_cut_off, type: double, nullable: false }
    - { name: definition_change_flag, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Adjusted deviation from baseline and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Data completeness at cut-off against Quality and performance reporting system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Adjusted deviation from baseline, traces back to Quality and performance reporting system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| CIC-IDS2017 intrusion detection | https://www.unb.ca/cic/datasets/ids-2017.html | Research use with citation (see the page) | Labelled network flows with benign traffic and common attacks over five days | Lab traffic; known labelling issues in places. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Numenta Anomaly Benchmark (NAB) | https://github.com/numenta/NAB | AGPL-3.0 (see the repository) | 58 labelled real and synthetic time series for streaming anomaly detection with a scoring scheme | Small and labels are debated. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCR Time Series Archive | https://www.cs.ucr.edu/~eamonn/time_series_data_2018/ | Research use with citation (see the page) | 128 labelled time-series classification datasets | Short curated series. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE clinical_quality_performance_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE clinical_quality_performance_outputs (
  run_id TEXT NOT NULL REFERENCES clinical_quality_performance_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE clinical_quality_performance_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE clinical_quality_performance_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Clinical Quality Performance Anomaly Detection": Detect unexpected changes in quality indicators across facilities, units, specialties and time, and tell analysts whether a change is more likely a data problem or a real performance shift before escalating. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Clinical data: what the record really contains | The electronic health record holds structured data (vitals, labs, medications, orders, diagnosis codes) and free text (notes, reports). Timestamps differ for ordering, collection and result; documentation is written after the fact; billing codes reflect reimbursement as much as truth; missingness is informative because tests are ordered when clinicians are worried. | Features and labels built from the record encode clinical behaviour, so leakage and bias are the default, not the exception. |
| Chart time, draw time and result time | A lab has an order time, a collection (draw) time and a result time, often an hour or more apart; vitals have a measurement time and a charting time. A feature may use a value only once clinicians could have seen it. | Using draw time instead of result time gives the model information the ward never had, so offline lead time looks better than real life. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Adjusted deviation from baseline | Standardised residual after seasonality and case mix. The core anomaly score. | Leakage risk to design against: Baseline fit on earlier periods. |
| A signal-versus-noise trap in this use case: Data first | The true signal is data-quality gate on completeness and definition changes; the common noise is treating every change as performance. | Most apparent shifts are data defects. |

**Ask the experts**

- [ ] What exactly does "Data-quality gates run before any performance alarm" mean in practice for clinical quality performance anomaly detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Adjusted deviation from baseline" and "Data completeness at cut-off", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Analyst-confirmed performance shifts caught early" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: treating data defects as performance, and who can confirm the cut-off times and splits?
- [ ] How often does "Measure specification update" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Clinical decision support | Software that gives clinicians patient-specific recommendations or alerts at the point of care. |
| Ambient scribe | A system that listens to a visit and drafts the clinical note for the clinician to review. |
| Remote patient monitoring | Tracking patients' vital signs at home and alerting clinicians to changes. |
| Alert burden | How many alerts clinicians receive per unit of care, which has to stay low enough that they keep responding. |
| ICD / CPT | Code sets for diagnoses (ICD) and procedures (CPT) used in billing and reporting. |
| HCC | Hierarchical condition category: a risk-adjustment grouping of diagnoses that determines payments. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Claim denial | An insurer's refusal to pay a claim, often fixable with correct documentation. |
| Triage | Sorting patients by urgency to decide who is seen first. |
| Ordinal triage scale | A graded urgency scale in which being wrong by two levels is worse than by one. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| Robust z-score | A deviation measure using the median and median absolute deviation, which outliers do not distort. |
| Level shift | An abrupt, lasting change in a series' average. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| F1 score | The harmonic mean of precision and recall. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Distribution shift | A change in the data a model sees compared with training. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
