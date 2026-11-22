# Physician Schedule Fairness Analytics: data and feature specification

> Generated from the blueprint `healthcare/physician-schedule-fairness-analytics` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Physician Schedule Fairness Analytics · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Physician Schedule Fairness Analytics": Measure how nights, weekends, holidays, call burden, undesirable shifts and workload are distributed across comparable physician groups, and show disparities and what-if adjustments to leaders. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Ranking individual physicians.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Burden index | weighted count of nights, weekends, holidays and call per FTE | Core fairness measure | Actual schedule |   |   |   |
| Dispersion within group | spread of the burden index in a comparable group | Shows disparity | Closed cycles |   |   |   |
| Exception-adjusted share | burden after approved exceptions | Fair comparison | Exceptions register |   |   |   |
| Persistence across cycles | repeat high burden for the same person or group | Chronic disparity | Several cycles |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Groups | Leadership-defined comparable groups | One pool | Specialties differ in call burden |
| Adjustment | FTE and approved exceptions applied | Raw counts | A part-time physician carries fewer shifts fairly |
| Metrics | Several defined measures of burden | Single total | Nights and holidays weigh differently |
| Privacy | Small groups aggregated | Individual league table | Ranking colleagues invites harm |
| Suggestions | Constrained what-ifs for leaders | Automatic rebalancing | Fairness needs context |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Physician name | not a fairness factor |
| Schedule layout | format |
| Tenure | not defined burden |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Burden index inputs | Medical group leadership | Scheduling system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: actual schedule. |
| Dispersion within group inputs | Physician scheduling office | Physician roster and group membership | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: closed cycles. |
| Exception-adjusted share inputs | Physician wellbeing lead | Approved exceptions register | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: exceptions register. |
| Persistence across cycles inputs | HR | Workload definitions | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: several cycles. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: physician_schedule_fairness_analytics_inputs.v1
owner: medical-group-leadership@example.com
system_of_record: Scheduling system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: burden_index, type: double, nullable: false }
    - { name: dispersion_within_group, type: double, nullable: false }
    - { name: exception_adjusted_share, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Burden index and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Dispersion within group against Scheduling system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Burden index, traces back to Scheduling system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Statlog German Credit Data (UCI) | https://archive.ics.uci.edu/dataset/144/statlog+german+credit+data | CC BY 4.0 (see the UCI page) | 1,000 credit applicants with a good or bad label and a cost matrix | Tiny and old; useful for fairness and explainability exercises, not scale. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| EMBER malware dataset | https://github.com/elastic/ember | AGPL-3.0 (see the repository) | 1 million Windows PE file feature vectors with benign and malicious labels and a time split | Features, not raw files; labelling cut-off artefacts. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Open University Learning Analytics Dataset (OULAD) | https://analyse.kmi.open.ac.uk/open_dataset | CC BY 4.0 (see the page) | Student demographics, VLE click streams and outcomes for 32,000 students | UK distance learning; coarse click aggregation. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE physician_schedule_fairness_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE physician_schedule_fairness_outputs (
  run_id TEXT NOT NULL REFERENCES physician_schedule_fairness_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE physician_schedule_fairness_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE physician_schedule_fairness_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Physician Schedule Fairness Analytics": Measure how nights, weekends, holidays, call burden, undesirable shifts and workload are distributed across comparable physician groups, and show disparities and what-if adjustments to leaders. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Population health, risk and fairness | Health systems stratify patients by risk to allocate care management, and predict readmissions, cost and chronic disease progression. Cost is not need: a model that predicts spending can underserve groups who historically had less access to care. | Choose targets that measure health need, and audit performance across demographic groups. |
| Definitions: Sepsis-3, SIRS and qSOFA | Sepsis-3 defines sepsis as suspected infection plus an acute rise of 2 or more points in the SOFA organ-failure score, and septic shock as sepsis that needs vasopressors to keep blood pressure up and has lactate above 2 mmol/L despite fluids. Older screening tools are still used: SIRS (two of abnormal temperature, heart rate, breathing rate or white cell count) and qSOFA (fast breathing, low systolic pressure, altered mentation). | Which definition you label with changes prevalence, onset time and what the model learns, so pick it with clinicians and write it down. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Burden index | Weighted count of nights, weekends, holidays and call per FTE. Core fairness measure. | Leakage risk to design against: Actual schedule. |
| A signal-versus-noise trap in this use case: Groups | The true signal is leadership-defined comparable groups; the common noise is one pool. | Specialties differ in call burden. |

**Ask the experts**

- [ ] What exactly does "Leaders interpret context and approve adjustments and the analytics make no employment decision" mean in practice for physician schedule fairness analytics: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Burden index" and "Dispersion within group", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Disparity reduced across cycles" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: ranking individual physicians, and who can confirm the cut-off times and splits?
- [ ] How often does "Very small group" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Alert burden | How many alerts clinicians receive per unit of care, which has to stay low enough that they keep responding. |
| Lead time | How many hours before onset an alert fires, the quantity that makes an early-warning system clinically useful. |
| Radiology report | The radiologist's written interpretation of an image, a common source of labels. |
| PHI | Protected health information: any health data that can identify a patient. |
| De-identification | Removing or masking identifiers from health data so it can be used for research. |
| Federated learning | Training a shared model across institutions without moving their data. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Fairness metrics | Measures of whether a model's errors or outcomes differ between groups, such as demographic parity or equalised odds. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Distribution shift | A change in the data a model sees compared with training. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
